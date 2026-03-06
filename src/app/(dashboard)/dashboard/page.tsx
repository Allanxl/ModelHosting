import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Settings, PlayCircle, Video, Database, Cpu, Zap, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const [apiConfigs, history] = await Promise.all([
        prisma.apiConfig.findMany({
            where: { ownerId: session.user.id, isActive: true },
            include: { models: true },
            orderBy: { createdAt: "desc" },
        }),
        prisma.generationHistory.findMany({
            where: { userId: session.user.id },
            include: { apiConfig: { select: { platformName: true } } },
            orderBy: { createdAt: "desc" },
            take: 5,
        }),
    ]);

    const totalModels = apiConfigs.reduce((sum: number, c: any) => sum + c.models.length, 0);
    const totalGenerations = history.length;
    const recentSuccess = history.filter((h: any) => h.status === "completed").length;

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">欢迎回来，{session.user.name || session.user.email}</h1>
                <p className="text-gray-600">快速开始您的 AI 视频创作之旅</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="border-gray-200 bg-white">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">配置数量</CardTitle>
                        <Database className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{apiConfigs.length}</div>
                    </CardContent>
                </Card>
                <Card className="border-gray-200 bg-white">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">可用模型</CardTitle>
                        <Cpu className="h-4 w-4 text-violet-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{totalModels}</div>
                    </CardContent>
                </Card>
                <Card className="border-gray-200 bg-white">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">生成总数</CardTitle>
                        <Zap className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{totalGenerations}</div>
                    </CardContent>
                </Card>
                <Card className="border-gray-200 bg-white">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">成功次数</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{recentSuccess}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-gray-200 bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-indigo-600" />
                            快速开始
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3 text-gray-700 text-sm">
                            <p className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">1</span>
                                在 <Link href="/apis" className="text-indigo-600 hover:text-indigo-700 underline">配置</Link> 页面中添加模型API Key和End Point。
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">2</span>
                                在 <Link href="/apis" className="text-indigo-600 hover:text-indigo-700 underline">管理</Link> 页面点击 分享 ，将权限授予其他注册用户。
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">3</span>
                                所有拥有权限的用户都可以在 <Link href="/playground" className="text-indigo-600 hover:text-indigo-700 underline">生成</Link> 页面中直接调用模型。
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">4</span>
                                在 <Link href="/history" className="text-indigo-600 hover:text-indigo-700 underline">资产</Link> 中随时查看和下载生成结果。
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Video className="h-5 w-5 text-violet-600" />
                                最近生成
                            </CardTitle>
                            <CardDescription className="text-gray-500">您最近的 5 条创作记录</CardDescription>
                        </div>
                        <Link href="/history">
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                                查看全部
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>还没有生成记录</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{item.prompt}</p>
                                            <p className="text-xs text-gray-500">
                                                {item.apiConfig.platformName} · {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                                            </p>
                                        </div>
                                        <div className="ml-3">
                                            {item.status === "completed" ? (
                                                <span className="text-emerald-600 text-xs">成功</span>
                                            ) : item.status === "failed" ? (
                                                <span className="text-red-600 text-xs">失败</span>
                                            ) : (
                                                <span className="text-amber-600 text-xs">处理中</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
