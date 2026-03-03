import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const deleteSchema = z.object({
    ids: z.array(z.string()).min(1),
});

export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { ids } = parsed.data;
    const userId = session.user.id;

    try {
        const result = await prisma.generationHistory.deleteMany({
            where: {
                id: { in: ids },
                userId: userId,
            },
        });

        return NextResponse.json({ count: result.count });
    } catch (error) {
        console.error("Delete history error:", error);
        return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }
}
