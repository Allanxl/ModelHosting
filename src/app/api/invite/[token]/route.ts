import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        // Redirect to login with return URL
        const { token } = await params;
        return NextResponse.redirect(new URL(`/login?redirect=/invite/${token}`, req.url));
    }

    const { token } = await params;
    const invite = await prisma.inviteToken.findUnique({
        where: { token },
        include: { apiConfig: { include: { owner: { select: { name: true, email: true } } } } },
    });

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        return NextResponse.redirect(new URL("/dashboard?error=invite-invalid", req.url));
    }

    // Check if already has permission
    const existing = await prisma.permission.findUnique({
        where: { apiConfigId_granteeId: { apiConfigId: invite.apiConfigId, granteeId: session.user.id } },
    });

    if (existing?.isActive) {
        return NextResponse.redirect(new URL("/dashboard?info=already-granted", req.url));
    }

    // Grant permission and mark token used
    await prisma.$transaction([
        prisma.permission.upsert({
            where: { apiConfigId_granteeId: { apiConfigId: invite.apiConfigId, granteeId: session.user.id } },
            update: { isActive: true, revokedAt: null },
            create: { apiConfigId: invite.apiConfigId, granteeId: session.user.id },
        }),
        prisma.inviteToken.update({ where: { token }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.redirect(new URL("/dashboard?success=invite-accepted", req.url));
}
