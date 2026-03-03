import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { EditApiClient } from "./client-page";

export default async function EditApiPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return redirect("/login");

    const { id } = await params;
    const config = await prisma.apiConfig.findFirst({
        where: { id, ownerId: session.user.id, isActive: true },
        include: { models: true },
    });

    if (!config) return notFound();

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <EditApiClient config={config} />
        </div>
    );
}
