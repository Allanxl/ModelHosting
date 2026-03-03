import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HistoryClient } from "./client-page";

export default async function HistoryPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const history = await prisma.generationHistory.findMany({
        where: {
            userId: session.user.id,
            createdAt: { gte: oneMonthAgo }
        },
        orderBy: { createdAt: "desc" },
        include: { apiConfig: { select: { platformName: true, baseUrl: true } } },
    });

    return <HistoryClient initialHistory={history} />;
}
