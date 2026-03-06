"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, PlayCircle, Database, History, Share2, LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const routes = [
    {
        label: "概览",
        icon: LayoutDashboard,
        href: "/dashboard",
        color: "text-sky-500",
    },
    {
        label: "生成",
        icon: PlayCircle,
        href: "/playground",
        color: "text-violet-500",
    },
    {
        label: "配置",
        icon: Database,
        href: "/apis",
        color: "text-pink-700",
    },
    {
        label: "资产",
        icon: History,
        href: "/history",
        color: "text-orange-700",
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <div className="flex h-full flex-col space-y-4 bg-gray-50 py-4 text-gray-900 border-r border-gray-200">
            <div className="flex-1 px-3 py-2">
                <Link href="/dashboard" className="mb-14 flex items-center pl-3">
                    <div className="relative mr-4 h-8 w-8">
                        <Share2 className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold">ModelHosting</h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route: { href: string; color: string; icon: any; label: string }) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "group flex w-full cursor-pointer justify-start rounded-lg p-3 text-sm font-medium transition hover:bg-gray-100 hover:text-gray-900",
                                pathname === route.href ? "bg-gray-100 text-gray-900" : "text-gray-600"
                            )}
                        >
                            <div className="flex flex-1 items-center">
                                <route.icon className={cn("mr-3 h-5 w-5", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="border-t border-gray-200 px-3 py-4">
                <div className="mb-4 flex items-center space-x-3 px-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600">
                        <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                            {session?.user?.name || "用户"}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[120px]">
                            {session?.user?.email}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    variant="ghost"
                    className="w-full justify-start text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    退出登录
                </Button>
            </div>
        </div>
    );
}
