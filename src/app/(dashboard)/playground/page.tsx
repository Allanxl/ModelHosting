import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlaygroundClient } from "./client-page";

export default async function PlaygroundPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const userId = session.user.id;

    // Fetch all models the user has access to (owned + shared)
    const [ownedConfigs, sharedPermissions] = await Promise.all([
        prisma.apiConfig.findMany({
            where: { ownerId: userId, isActive: true },
            include: { models: true },
        }),
        prisma.permission.findMany({
            where: { granteeId: userId, isActive: true, apiConfig: { isActive: true } },
            include: { apiConfig: { include: { models: true } } },
        }),
    ]);

    // Flatten models into a selectable list
    const availableModels = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...ownedConfigs.flatMap((c: any) => c.models.map((m: any) => ({
            ...m,
            platformName: c.platformName,
            isOwner: true,
        }))),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...sharedPermissions.flatMap((p: any) => p.apiConfig.models.map((m: any) => ({
            ...m,
            platformName: p.apiConfig.platformName,
            isOwner: false,
        }))),
    ];

    return (
        <div className="p-8 h-full">
            <PlaygroundClient models={availableModels} />
        </div>
    );
}
