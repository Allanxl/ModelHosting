import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { monthOffset: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "未授权" }, { status: 401 });
        }

        const monthOffset = parseInt(params.monthOffset);
        if (isNaN(monthOffset) || monthOffset < 0) {
            return NextResponse.json({ error: "无效的月份偏移" }, { status: 400 });
        }

        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const startDate = new Date(now.getFullYear(), now.getMonth() - monthOffset - 1, 1);

        const history = await prisma.generationHistory.findMany({
            where: {
                userId: session.user.id,
                createdAt: {
                    gte: startDate,
                    lt: endDate
                }
            },
            orderBy: { createdAt: "desc" },
            include: { apiConfig: { select: { platformName: true, baseUrl: true } } },
        });

        return NextResponse.json(history);
    } catch (error) {
        console.error("获取历史记录失败:", error);
        return NextResponse.json({ error: "获取失败" }, { status: 500 });
    }
}
