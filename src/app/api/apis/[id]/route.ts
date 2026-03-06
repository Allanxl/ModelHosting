import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptApiKey } from "@/lib/crypto";
import { z } from "zod";

const updateSchema = z.object({
    platformName: z.string().min(1).max(100).optional(),
    baseUrl: z.string().url().optional(),
    apiKey: z.string().optional(), // only if user wants to change it
    dailyVideoLimit: z.number().int().min(1).max(10000).optional(),
    models: z.array(z.object({
        modelId: z.string().min(1),
        label: z.string().min(1),
    })).optional(),
});

async function requireOwner(configId: string, userId: string) {
    const config = await prisma.apiConfig.findFirst({
        where: { id: configId, ownerId: userId, isActive: true },
    });
    return config;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const config = await prisma.apiConfig.findFirst({
        where: { id, ownerId: session.user.id },
        include: {
            models: true,
            permissions: {
                where: { isActive: true },
                include: {
                    grantee: { select: { id: true, name: true, email: true } },
                    _count: { select: { usageLogs: true } },
                },
            },
        },
    });

    if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ...config, encryptedApiKey: undefined });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const config = await requireOwner(id, session.user.id);
    if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { models, apiKey, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (apiKey) updateData.encryptedApiKey = encryptApiKey(apiKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await prisma.$transaction(async (tx: any) => {
        const c = await tx.apiConfig.update({ where: { id }, data: updateData });
        if (models) {
            await tx.apiModel.deleteMany({ where: { apiConfigId: id } });
            await tx.apiModel.createMany({ data: (models as any[]).map((m: any) => ({ ...m, apiConfigId: id })) });
        }
        return c;
    });

    return NextResponse.json({ ...updated, encryptedApiKey: undefined });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const config = await requireOwner(id, session.user.id);
    if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Soft delete
    await prisma.apiConfig.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
}
