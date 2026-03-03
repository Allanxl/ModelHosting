import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/mailer";
import { z } from "zod";

const shareSchema = z.object({
    email: z.string().email(),
});

// POST /api/apis/[id]/share - grant permission by email
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const config = await prisma.apiConfig.findFirst({
        where: { id, ownerId: session.user.id, isActive: true },
    });
    if (!config) return NextResponse.json({ error: "API config not found" }, { status: 404 });

    const body = await req.json();
    const action = body.action as string;

    if (action === "share-by-email") {
        const parsed = shareSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

        const { email } = parsed.data;
        if (email === session.user.email) {
            return NextResponse.json({ error: "不能为自己设置权限" }, { status: 400 });
        }

        const grantee = await prisma.user.findUnique({ where: { email } });
        if (!grantee) return NextResponse.json({ error: "该邮箱未注册" }, { status: 404 });

        await prisma.permission.upsert({
            where: { apiConfigId_granteeId: { apiConfigId: id, granteeId: grantee.id } },
            update: { isActive: true, revokedAt: null },
            create: { apiConfigId: id, granteeId: grantee.id },
        });

        return NextResponse.json({ ok: true, grantee: { name: grantee.name, email: grantee.email } });
    }

    if (action === "generate-invite") {
        const expiresAt = new Date(Date.now() + 72 * 3600_000); // 72 hours
        const invite = await prisma.inviteToken.create({
            data: { apiConfigId: id, expiresAt },
        });
        const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${invite.token}`;

        // Optionally send to email
        if (body.email) {
            try {
                await sendInviteEmail(
                    body.email,
                    inviteUrl,
                    config.platformName,
                    session.user.name ?? session.user.email ?? "用户"
                );
            } catch (e) {
                console.error("Invite email failed:", e);
            }
        }

        return NextResponse.json({ token: invite.token, inviteUrl });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// DELETE /api/apis/[id]/share?granteeId=xxx - revoke permission
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const config = await prisma.apiConfig.findFirst({
        where: { id, ownerId: session.user.id, isActive: true },
    });
    if (!config) return NextResponse.json({ error: "API config not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const granteeId = searchParams.get("granteeId");
    if (!granteeId) return NextResponse.json({ error: "granteeId required" }, { status: 400 });

    await prisma.permission.updateMany({
        where: { apiConfigId: id, granteeId },
        data: { isActive: false, revokedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
}
