import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApisClient } from "./client-page";

export default async function ApisPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const configs = await prisma.apiConfig.findMany({
        where: { ownerId: session.user.id, isActive: true },
        include: {
            models: true,
            permissions: {
                where: { isActive: true },
                include: { grantee: { select: { id: true, name: true, email: true } } },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="p-8">
            <ApisClient initialConfigs={configs} />
        </div>
    );
}
