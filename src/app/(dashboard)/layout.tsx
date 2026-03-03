import { Sidebar } from "@/components/sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="relative h-full">
            <div className="hidden h-full md:fixed md:inset-y-0 md:flex md:w-72 md:flex-col">
                <Sidebar />
            </div>
            <main className="md:pl-72">
                {children}
            </main>
        </div>
    );
}
