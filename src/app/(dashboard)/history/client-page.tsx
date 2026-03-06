"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Video, Clock, CheckCircle2, XCircle, Loader2, Trash2, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { VideoPlayer } from "./video-player";

type HistoryItem = {
    id: string;
    userId: string;
    apiConfigId: string;
    modelId: string;
    prompt: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any;
    resultUrl?: string | null;
    resultData?: unknown;
    status: string;
    errorMsg?: string | null;
    createdAt: Date;
    updatedAt: Date;
    apiConfig: { platformName: string; baseUrl: string };
};

interface HistoryClientProps {
    initialHistory: HistoryItem[];
}

export function HistoryClient({ initialHistory }: HistoryClientProps) {
    const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const formatMonthLabel = (offset: number) => {
        const now = new Date();
        const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        return date.toLocaleString("zh-CN", { year: "numeric", month: "long" });
    };

    const loadMoreHistory = async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        try {
            const nextOffset = currentMonthOffset + 1;
            const res = await fetch(`/api/history/${nextOffset}`);

            if (!res.ok) {
                setHasMore(false);
                return;
            }

            const newHistory = await res.json();
            if (newHistory.length === 0) {
                setHasMore(false);
            } else {
                setHistory(prev => [...prev, ...newHistory]);
                setCurrentMonthOffset(nextOffset);
            }
        } catch {
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === history.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(history.map((item: HistoryItem) => item.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id]
        );
    };

    const deleteItems = async (ids: string[], message?: string) => {
        setDeleting(true);
        try {
            const res = await fetch("/api/history", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids })
            });
            if (!res.ok) throw new Error("删除失败");
            const data = await res.json();
            setHistory(prev => prev.filter((item: HistoryItem) => !ids.includes(item.id)));
            setSelectedIds(prev => prev.filter((id: string) => !ids.includes(id)));
            toast.success(message || `成功删除 ${data.count} 条记录`);
        } catch {
            toast.error("删除失败，请重试");
        } finally {
            setDeleting(false);
        }
    };

    const deleteSingle = (id: string) => {
        deleteItems([id], "成功删除 1 条记录");
    };

    const deleteSelected = () => {
        if (selectedIds.length === 0) return;
        deleteItems(selectedIds);
    };

    const deleteInvalid = () => {
        const invalidIds = history.filter((item: HistoryItem) =>
            item.status === "failed" ||
            (item.status === "completed" && !item.resultUrl)
        ).map((item: HistoryItem) => item.id);

        if (invalidIds.length === 0) {
            toast.info("没有无效的视频记录");
            return;
        }

        deleteItems(invalidIds, `成功删除 ${invalidIds.length} 条无效记录`);
    };

    const downloadSelected = async () => {
        const selectedItems = history.filter((item: HistoryItem) => selectedIds.includes(item.id) && item.status === "completed" && item.resultUrl);
        if (selectedItems.length === 0) {
            toast.info("请先选择已完成且有视频的记录");
            return;
        }
        for (const item of selectedItems) {
            if (item.resultUrl) {
                try {
                    const a = document.createElement('a');
                    a.href = item.resultUrl;
                    a.download = `video-${item.id}.mp4`;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (e) {
                    console.error('下载失败:', e);
                }
            }
        }
        toast.success(`开始下载 ${selectedItems.length} 个视频`);
    };

    const groupedHistory = (() => {
        const groups: { [key: string]: HistoryItem[] } = {};
        history.forEach((item: HistoryItem) => {
            const dateKey = new Date(item.createdAt).toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(item);
        });
        return groups;
    })();

    return (
        <div className="p-8">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">资产</h2>
                    {history.length > 0 && (
                        <div className="flex gap-2">
                            {selectedIds.length === 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={deleteInvalid}
                                    disabled={deleting}
                                    className="text-amber-500 border-amber-900 hover:bg-amber-900/20"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    一键删除无效
                                </Button>
                            )}
                            {selectedIds.length > 0 && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={downloadSelected}
                                        disabled={deleting}
                                        className="text-emerald-400 border-emerald-900 hover:bg-emerald-900/20"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        下载
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={deleteSelected}
                                        disabled={deleting}
                                        className="text-red-400 border-red-900 hover:bg-red-900/20"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        删除
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <p className="text-gray-600">查看您过去的所有创作记录</p>
                {history.length > 0 && (
                    <div className="flex items-center gap-4 mt-4">
                        <Checkbox
                            id="select-all"
                            checked={history.length > 0 && selectedIds.length === history.length}
                            onCheckedChange={toggleSelectAll}
                        />
                        <label
                            htmlFor="select-all"
                            className="text-sm text-gray-600 cursor-pointer"
                        >
                            {selectedIds.length === 0 ? "全选" : `已选择 ${selectedIds.length} 条`}
                        </label>
                    </div>
                )}
            </div>

            <div className="space-y-8">
                {history.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                        暂无生成记录
                    </div>
                ) : (
                    Object.entries(groupedHistory).map(([dateKey, items]) => (
                        <div key={dateKey} className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-600 border-b border-gray-200 pb-2">
                                {dateKey}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {items.map((item: HistoryItem) => (
                                    <Card
                                        key={item.id}
                                        className={`border-gray-200 bg-white overflow-hidden flex flex-col transition-all ${selectedIds.includes(item.id) ? 'ring-2 ring-violet-500' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between p-1.5 border-b border-gray-200">
                                            <Checkbox
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={() => toggleSelect(item.id)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-red-400"
                                                onClick={() => deleteSingle(item.id)}
                                                disabled={deleting}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="aspect-[4/3] max-h-40 bg-black relative flex items-center justify-center overflow-hidden group">
                                            {item.status === "completed" && item.resultUrl ? (
                                                <VideoPlayer src={item.resultUrl} />
                                            ) : item.status === "processing" ? (
                                                <div className="flex flex-col items-center gap-2 text-violet-500">
                                                    <Loader2 className="h-8 w-8 animate-spin" />
                                                    <span className="text-xs">生成中...</span>
                                                </div>
                                            ) : (
                                                <Video className="h-10 w-10 text-zinc-80" />
                                            )}
                                        </div>
                                        <CardHeader className="p-1.5 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className="text-[8px] border-gray-300 text-gray-600">
                                                        {item.apiConfig.platformName}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[8px] border-gray-300 text-gray-500">
                                                        {item.modelId}
                                                    </Badge>
                                                </div>
                                                {item.status === "completed" ? (
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                ) : item.status === "failed" ? (
                                                    <XCircle className="h-3 w-3 text-red-500" />
                                                ) : (
                                                    <Clock className="h-3 w-3 text-amber-500" />
                                                )}
                                            </div>
                                            <CardTitle className="text-[11px] font-medium text-gray-900 line-clamp-2 min-h-[24px]">
                                                {item.prompt}
                                            </CardTitle>
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {hasMore && (
                <div className="flex justify-center py-8">
                    <Button
                        variant="outline"
                        onClick={loadMoreHistory}
                        disabled={loading}
                        className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                加载中...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                加载 {formatMonthLabel(currentMonthOffset + 1)} 的记录
                            </>
                        )}
                    </Button>
                </div>
            )}

            {!hasMore && history.length > 0 && (
                <div className="text-center py-8 text-zinc-600">
                    已加载全部历史记录
                </div>
            )}
        </div>
    );
}
