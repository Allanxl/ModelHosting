import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
    await transporter.sendMail({
        from: process.env.SMTP_FROM ?? "ModelHosting <no-reply@example.com>",
        to,
        subject: "重置您的密码 - ModelHosting",
        html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1a1a2e;">重置密码</h2>
        <p>点击下方链接重置您的密码（链接1小时内有效）：</p>
        <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
          重置密码
        </a>
        <p style="color:#666;font-size:14px;">如果您未申请重置密码，请忽略此邮件。</p>
      </div>
    `,
    });
}

export async function sendInviteEmail(to: string, inviteUrl: string, platformName: string, ownerName: string) {
    await transporter.sendMail({
        from: process.env.SMTP_FROM ?? "ModelHosting <no-reply@example.com>",
        to,
        subject: `${ownerName} 邀请您使用 ${platformName} - ModelHosting`,
        html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1a1a2e;">您收到了一个邀请</h2>
        <p><strong>${ownerName}</strong> 邀请您使用 <strong>${platformName}</strong> 的 AI 模型。</p>
        <a href="${inviteUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
          接受邀请
        </a>
        <p style="color:#666;font-size:14px;">链接72小时内有效。</p>
      </div>
    `,
    });
}
