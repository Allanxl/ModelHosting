import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptApiKey } from "@/lib/crypto";
import { z } from "zod";

const createSchema = z.object({
    platformName: z.string().min(1).max(100),
    baseUrl: z.string().url(),
    apiKey: z.string().min(1),
    dailyVideoLimit: z.number().int().min(1).max(10000).default(50),
    models: z.array(z.object({
        modelId: z.string().min(1),
        label: z.string().min(1),
    })).min(1),
});

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const configs = await prisma.apiConfig.findMany({
        where: { ownerId: session.user.id, isActive: true },
        include: {
            models: true,
            permissions: {
                where: { isActive: true },
                include: { grantee: { select: { id: true, name: true, email: true } } },
            },
            _count: { select: { usageLogs: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    // Never return the encrypted key to the client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json(configs.map((c: any) => ({
        ...c,
        encryptedApiKey: undefined,
        apiKeyMasked: "••••••••" + c.encryptedApiKey.slice(-4),
    })));
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const { platformName, baseUrl, apiKey, dailyVideoLimit, models } = parsed.data;
    const encryptedApiKey = encryptApiKey(apiKey);

    const config = await prisma.apiConfig.create({
        data: {
            ownerId: session.user.id,
            platformName,
            baseUrl,
            encryptedApiKey,
            dailyVideoLimit,
            models: { create: models },
        },
        include: { models: true },
    });

    return NextResponse.json({ ...config, encryptedApiKey: undefined }, { status: 201 });
}
