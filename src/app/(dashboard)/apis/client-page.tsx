"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Database, Share2, Trash2, Edit2, Link2, MoreVertical, ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type ApiConfigWithModels = {
    id: string;
    platformName: string;
    baseUrl: string;
    dailyVideoLimit: number;
    createdAt: Date;
    models: { id: string; modelId: string; label: string }[];
    permissions: { id: string; grantee: { name: string | null; email: string } }[];
};

export function ApisClient({ initialConfigs }: { initialConfigs: ApiConfigWithModels[] }) {
    const [configs, setConfigs] = useState(initialConfigs);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<ApiConfigWithModels | null>(null);
    const [shareEmail, setShareEmail] = useState("");
    const [inviteLink, setInviteLink] = useState("");

    const handleDelete = async (id: string) => {
        if (!confirm("确定要删除此 API 配置吗？删除后所有分享也将失效。")) return;

        try {
            const res = await fetch(`/api/apis/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("删除失败");
            setConfigs(configs.filter((c) => c.id !== id));
            toast.success("已成功删除 API 配置");
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const shareByEmail = async () => {
        if (!selectedConfig || !shareEmail) return;

        try {
            const res = await fetch(`/api/apis/${selectedConfig.id}/share`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "share-by-email", email: shareEmail }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "授权失败");

            toast.success(`成功授权给 ${shareEmail}`);
            setIsShareDialogOpen(false);
            setShareEmail("");
            // Refresh local state if needed (optional since owner stays on list)
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const generateInvite = async () => {
        if (!selectedConfig) return;

        try {
            const res = await fetch(`/api/apis/${selectedConfig.id}/share`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "generate-invite" }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "生成失败");

            setInviteLink(data.inviteUrl);
            setIsInviteDialogOpen(true);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">配置</h2>
                    <p className="text-gray-600">管理您的第三方 AI 服务 API Key 和使用权限</p>
                </div>
                <Link href="/apis/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="mr-2 h-4 w-4" /> 新增 API
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {configs.map((config) => (
                    <Card key={config.id} className="border-gray-200 bg-white group">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Database className="h-4 w-4 text-sky-500" />
                                    {config.platformName}
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-500 truncate max-w-[200px]">
                                    {config.baseUrl}
                                </CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 text-gray-600 group-hover:text-gray-900">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border-gray-200 text-gray-700">
                                    <DropdownMenuItem asChild>
                                        <Link href={`/apis/${config.id}/edit`} className="cursor-pointer">
                                            <Edit2 className="mr-2 h-4 w-4" /> 编辑
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedConfig(config);
                                            setIsShareDialogOpen(true);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Mail className="mr-2 h-4 w-4" /> 邮件授权
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedConfig(config);
                                            generateInvite();
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Link2 className="mr-2 h-4 w-4" /> 生成邀请链接
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-gray-100" />
                                    <DropdownMenuItem
                                        onClick={() => handleDelete(config.id)}
                                        className="cursor-pointer text-red-500 focus:text-red-500"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> 删除
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {config.models.map((m) => (
                                    <Badge key={m.id} variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
                                        {m.label}
                                    </Badge>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex flex-col gap-1">
                                    <span className="text-gray-500">每日调用上限</span>
                                    <span className="text-gray-700 font-medium">{config.dailyVideoLimit} 次</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-gray-500">已授权用户</span>
                                    <span className="text-gray-700 font-medium">{config.permissions.length} 人</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t border-gray-200 pt-4 bg-white/50">
                            <div className="flex items-center gap-2 text-xs text-emerald-500">
                                <ShieldCheck className="h-3 w-3" />
                                <span>加密存储，前端不可见 API Key</span>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Share by Email Dialog */}
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900">
                    <DialogHeader>
                        <DialogTitle>授予使用权限</DialogTitle>
                        <DialogDescription className="text-gray-600">
                            输入注册用户的邮箱，直接授予其使用此 API 的权限。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">用户邮箱</Label>
                            <Input
                                id="email"
                                placeholder="user@example.com"
                                value={shareEmail}
                                onChange={(e) => setShareEmail(e.target.value)}
                                className="bg-gray-100 border-gray-300"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsShareDialogOpen(false)}>取消</Button>
                        <Button onClick={shareByEmail} className="bg-indigo-600 hover:bg-indigo-700">确认授权</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invite Link Dialog */}
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900">
                    <DialogHeader>
                        <DialogTitle>群组/邀请链接</DialogTitle>
                        <DialogDescription className="text-gray-600">
                            将此链接发送给其它注册用户，点击链接即可自动获得使用权限。链接有效期为 72 小时。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center space-x-2">
                            <Input
                                readOnly
                                value={inviteLink}
                                className="bg-gray-100 border-gray-300"
                            />
                            <Button
                                onClick={() => {
                                    navigator.clipboard.writeText(inviteLink);
                                    toast.success("已复制到剪贴板");
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
                            >
                                复制
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsInviteDialogOpen(false)} className="bg-indigo-600 hover:bg-indigo-700">完成</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
