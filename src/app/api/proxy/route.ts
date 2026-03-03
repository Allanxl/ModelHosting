import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { rateLimitCheck } from "@/lib/rateLimit";
import { z } from "zod";

const proxySchema = z.object({
    apiConfigId: z.string(),
    modelId: z.string(),
    prompt: z.string().min(1).max(4000),
    params: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit
    const rl = rateLimitCheck(session.user.id);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: "请求过于频繁，请稍后再试" },
            { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
        );
    }

    const body = await req.json();
    const parsed = proxySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { apiConfigId, modelId, prompt, params } = parsed.data;
    
    const mode = params?.mode || "text_only";
    const imageUrls = (params as any)?.image_urls || [];
    const activeImages = imageUrls.filter((url: string) => url.trim() !== "");
    
    if (mode === "reference") {
        if (activeImages.length === 0) {
            return NextResponse.json({ error: "参考图模式需要至少一张图片URL" }, { status: 400 });
        }
    } else if (mode === "first_last") {
        if (activeImages.length < 2) {
            return NextResponse.json({ error: "首尾帧模式需要两张图片URL（首帧和尾帧）" }, { status: 400 });
        }
    }
    const userId = session.user.id;

    // Load API config – owner can always use their own configs
    const config = await prisma.apiConfig.findFirst({
        where: {
            id: apiConfigId,
            isActive: true,
            OR: [
                { ownerId: userId },
                { permissions: { some: { granteeId: userId, isActive: true } } },
            ],
        },
        include: {
            models: true,
            permissions: { where: { granteeId: userId, isActive: true } },
        },
    });

    if (!config) return NextResponse.json({ error: "API config not found or access denied" }, { status: 403 });

    // Verify model is in allowed list
    const modelAllowed = config.models.some((m: any) => m.modelId === modelId);
    if (!modelAllowed) return NextResponse.json({ error: "模型不在授权列表中" }, { status: 403 });

    // Daily quota check
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayUsage = await prisma.usageLog.count({
        where: { apiConfigId, userId, createdAt: { gte: todayStart }, status: "success" },
    });

    if (todayUsage >= config.dailyVideoLimit) {
        return NextResponse.json({ error: `今日配额已用完 (${config.dailyVideoLimit}次)` }, { status: 429 });
    }

    // Decrypt API key
    let apiKey: string;
    try {
        apiKey = decryptApiKey(config.encryptedApiKey);
        console.log("Debug API Key info:", {
            length: apiKey.length,
            masked: `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`,
            hasBearer: apiKey.toLowerCase().startsWith("bearer")
        });
    } catch {
        return NextResponse.json({ error: "API配置错误，请联系管理员" }, { status: 500 });
    }

    // Save generation history entry (pending)
    const historyEntry = await prisma.generationHistory.create({
        data: {
            userId,
            apiConfigId,
            modelId,
            prompt,
            params: (params ?? {}) as any,
            status: "processing",
        },
    });

    // Forward request to the upstream API
    const permissionId = config.permissions[0]?.id ?? null;

    try {
        // Volcano Ark Transformation
        const modelLabel = config.models.find((m: any) => m.modelId === modelId)?.label || "";
        const isV2 = modelLabel.includes("2.0");
        const isV15 = modelLabel.includes("1.5");
        const isV10 = modelLabel.includes("1.0");
        const isFast = modelLabel.includes("Fast");

        let volcanoPayload: any;

        let baseInputContent: any[] = [];
        
        if (params?.mode === "first_last" && !isFast) {
            const activeImages = (params as any)?.image_urls || [];
            if (activeImages.length >= 2) {
                baseInputContent = [
                    { type: "text", text: prompt },
                    { 
                        type: "image_url", 
                        image_url: { url: activeImages[0] },
                        role: "first_frame"
                    },
                    { 
                        type: "image_url", 
                        image_url: { url: activeImages[1] },
                        role: "last_frame"
                    }
                ];
                console.log("First/Last mode: Using content with roles:", baseInputContent);
            } else {
                baseInputContent = [
                    { type: "text", text: prompt },
                    ...((params as any)?.image_urls?.map((url: string) => ({
                        type: "image_url",
                        image_url: { url }
                    })) || [])
                ];
            }
        } else {
            baseInputContent = [
                { type: "text", text: prompt },
                ...((params as any)?.image_urls?.map((url: string) => ({
                    type: "image_url",
                    image_url: { url }
                })) || [])
            ];
        }

        const inputContent = isV2 
            ? baseInputContent.map(item => {
                if (item.role === "first_frame" || item.role === "last_frame") {
                    return item;
                }
                return { ...item, role: "user" };
            }) 
            : baseInputContent;

        if (isV2) {
            let duration = Number(params?.duration) || 8;
            duration = Math.max(4, Math.min(duration, 12));
            
            volcanoPayload = {
                model: modelId,
                input: {
                    content: inputContent
                },
                parameters: {
                    resolution: params?.resolution || "720p",
                    duration: duration,
                    aspect_ratio: params?.aspect_ratio || "16:9",
                    generate_audio: params?.generate_audio ?? false,
                    fixed_lens: params?.fixed_lens ?? false,
                }
            };
        } else {
            let duration = Number(params?.duration) || 5;
            if (isV15) {
                duration = Math.max(4, Math.min(duration, 12));
            } else {
                duration = Math.max(2, Math.min(duration, 12));
            }
            
            volcanoPayload = {
                model: modelId,
                content: inputContent,
                ratio: params?.aspect_ratio === "auto" ? "adaptive" : (params?.aspect_ratio || "16:9"),
                resolution: params?.resolution || "720p",
                duration: duration,
                watermark: false,
            };

            if (isV15) {
                
                volcanoPayload.generate_audio = params?.generate_audio ?? false;
            }

            if (params?.mode === "first_last" && !isFast) {
                const activeImages = (params as any)?.image_urls || [];
                console.log("First/Last mode detected, active images:", activeImages);
                if (activeImages.length >= 2) {
                    volcanoPayload.mode = 1;
                    console.log("Set mode for first/last frame generation:", volcanoPayload.mode);
                }
            }
        }

        const effectiveUrl = config.baseUrl;

        const maskedKey = `${apiKey.slice(0, 4)}***${apiKey.slice(-4)}`;

        console.log("\n========== VOLCANO API REQUEST ==========");
        console.log(`POST ${effectiveUrl}`);
        console.log(`Headers: { "Content-Type": "application/json", "Authorization": "Bearer ${maskedKey}" }`);
        console.log("Payload:", JSON.stringify(volcanoPayload, null, 2));
        console.log("=========================================\n");

        // Helper to log CURL for easy manual testing
        const curl = `curl -X POST ${effectiveUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${maskedKey}" \\
  -d '${JSON.stringify(volcanoPayload)}'`;
        console.log("--- DEBUG CURL START ---\n" + curl + "\n--- DEBUG CURL END ---\n");

        const upstream = await fetch(effectiveUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify(volcanoPayload),
        });

        let data: any;
        const responseText = await upstream.text();
        const contentType = upstream.headers.get("content-type");
        
        console.log("\n========== VOLCANO API RESPONSE ==========");
        console.log(`Status: ${upstream.status}`);
        console.log(`Content-Type: ${contentType}`);
        console.log(`Response Text: ${responseText}`);
        console.log("==========================================\n");

        try {
            data = JSON.parse(responseText);
            console.log("Parsed JSON Data:", JSON.stringify(data, null, 2));
        } catch (parseErr) {
            console.error("JSON parsing failed:", parseErr);
            throw new Error(`Volcano returned invalid JSON (${upstream.status}). Body: ${responseText.slice(0, 500)}`);
        }

        // Log usage (as success if task created)
        await prisma.usageLog.create({
            data: {
                userId,
                apiConfigId,
                permissionId,
                modelId,
                prompt: prompt.slice(0, 500),
                status: upstream.ok ? "success" : "error",
            },
        });

        if (upstream.ok) {
            const taskId = data.id || data.task_id;

            await prisma.generationHistory.update({
                where: { id: historyEntry.id },
                data: {
                    status: "processing", // Volcano tasks are usually async
                    resultData: data, // Store the initial response (contains taskId)
                },
            });

            return NextResponse.json({ ok: true, historyId: historyEntry.id, taskId, result: data });
        } else {
            await prisma.generationHistory.update({
                where: { id: historyEntry.id },
                data: { status: "failed", errorMsg: JSON.stringify(data).slice(0, 500) },
            });
            return NextResponse.json({ error: "火山引擎返回错误", detail: data }, { status: upstream.status });
        }
    } catch (err) {
        console.error("Proxy exception:", err);
        await prisma.generationHistory.update({
            where: { id: historyEntry.id },
            data: { status: "failed", errorMsg: String(err) },
        });
        return NextResponse.json({ error: "请求失败，请检查网络及API配置", detail: String(err) }, { status: 502 });
    }
}

// GET /api/proxy?historyId=xxx – poll for result
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const historyId = new URL(req.url).searchParams.get("historyId");
    if (!historyId) return NextResponse.json({ error: "historyId required" }, { status: 400 });

    let entry = await prisma.generationHistory.findFirst({
        where: { id: historyId, userId: session.user.id },
        include: { apiConfig: true }
    });

    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // If still processing, try to poll upstream
    if (entry.status === "processing" || entry.status === "pending") {
        try {
            const apiKey = decryptApiKey(entry.apiConfig.encryptedApiKey);
            const taskId = (entry.resultData as any)?.id || (entry.resultData as any)?.task_id;

            if (taskId) {
                // Poll Volcano status: GET baseurl/{taskId}
                // Note: Volcano Ark video polling URL is usually the base task URL + /taskId
                const normalizedBaseUrl = entry.apiConfig.baseUrl.endsWith("/")
                    ? entry.apiConfig.baseUrl.slice(0, -1)
                    : entry.apiConfig.baseUrl;
                const pollUrl = `${normalizedBaseUrl}/${taskId}`;
                console.log("Polling Volcano Status:", pollUrl);
                const res = await fetch(pollUrl, {
                    headers: { Authorization: `Bearer ${apiKey}` }
                });

                if (res.ok) {
                    const pollResponseText = await res.text();
                    console.log("Poll response text:", pollResponseText);
                    
                    let statusData: any;
                    try {
                        statusData = JSON.parse(pollResponseText);
                    } catch (parseErr) {
                        console.error("Poll JSON parsing failed:", parseErr);
                        statusData = { raw_response: pollResponseText };
                    }
                    
                    const volcanoStatus = statusData.status; // pending | running | succeeded | failed
                    console.log("Volcano status:", volcanoStatus);

                    let newStatus = entry.status;
                    let resultUrl = entry.resultUrl;

                    if (volcanoStatus === "succeeded") {
                        newStatus = "completed";
                        // Different versions use different structures for video_url
                        resultUrl = statusData.content?.video_url ||
                            statusData.output?.video_url ||
                            statusData.resultData?.video_url ||
                            statusData.video_url ||
                            statusData.result?.url;
                        console.log("Found result URL:", resultUrl);
                    } else if (volcanoStatus === "failed") {
                        newStatus = "failed";
                    }

                    entry = await prisma.generationHistory.update({
                        where: { id: historyId },
                        data: {
                            status: newStatus,
                            resultUrl,
                            resultData: statusData,
                            errorMsg: volcanoStatus === "failed" ? JSON.stringify(statusData.error || statusData) : null
                        },
                        include: { apiConfig: true }
                    });
                }
            }
        } catch (err) {
            console.error("Polling error:", err);
        }
    }

    return NextResponse.json(entry);
}
