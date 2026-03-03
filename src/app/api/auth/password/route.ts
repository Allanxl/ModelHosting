import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { z } from "zod";

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
    token: z.string(),
    email: z.string().email(),
    password: z.string().min(8),
});

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "forgot") {
        const body = await req.json();
        const parsed = forgotSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

        const { email } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        // Always return success to prevent email enumeration
        if (!user) return NextResponse.json({ ok: true });

        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 3600_000); // 1 hour

        await prisma.verificationToken.upsert({
            where: { identifier_token: { identifier: email, token } },
            update: { expires },
            create: { identifier: email, token, expires, userId: user.id },
        });

        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
        try {
            await sendPasswordResetEmail(email, resetUrl);
        } catch (e) {
            console.error("Email send failed:", e);
        }

        return NextResponse.json({ ok: true });
    }

    if (action === "reset") {
        const body = await req.json();
        const parsed = resetSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

        const { token, email, password } = parsed.data;
        const vt = await prisma.verificationToken.findUnique({
            where: { identifier_token: { identifier: email, token } },
        });

        if (!vt || vt.expires < new Date()) {
            return NextResponse.json({ error: "Token无效或已过期" }, { status: 400 });
        }

        const bcrypt = await import("bcryptjs");
        const passwordHash = await bcrypt.hash(password, 12);

        await prisma.user.update({ where: { email }, data: { passwordHash } });
        await prisma.verificationToken.delete({
            where: { identifier_token: { identifier: email, token } },
        });

        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
