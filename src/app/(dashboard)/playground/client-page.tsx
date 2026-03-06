"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
    Send,
    Video,
    RefreshCw,
    AlertCircle,
    ImageIcon,
    Settings2,
    X,
    ChevronDown,
    Volume2,
    Type,
    Layers,
    Clock,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type PlaygroundModel = {
    id: string;
    apiConfigId: string;
    modelId: string;
    label: string;
    platformName: string;
    isOwner: boolean;
};

type SubmissionParams = {
    modelId: string;
    prompt: string;
    genMode: "text_only" | "reference" | "first_last";
    imageUrls: string[];
    aspectRatio: string;
    resolution: string;
    duration: number;
    videoCount: number;
    generateAudio: boolean;
};

type VideoTask = {
    id: string;
    prompt: string;
    platformName: string;
    modelLabel: string;
    status: "processing" | "completed" | "failed";
    progress: number;
    resultUrl?: string;
    errorInfo?: { code?: string; message: string; rawData?: unknown };
    params: SubmissionParams;
};

const RATIOS = [
    { label: "21:9", value: "21:9", icon: "▭" },
    { label: "16:9", value: "16:9", icon: "▭" },
    { label: "4:3", value: "4:3", icon: "□" },
    { label: "1:1", value: "1:1", icon: "□" },
    { label: "3:4", value: "3:4", icon: "▯" },
    { label: "9:16", value: "9:16", icon: "▯" },
    { label: "智能", value: "auto", icon: "" },
];

const MAX_CONCURRENT_TASKS = 5;

export function PlaygroundClient({ models }: { models: PlaygroundModel[] }) {
    const [selectedModel, setSelectedModel] = useState<PlaygroundModel | null>(models[0] || null);
    const [prompt, setPrompt] = useState("");
    const [genMode, setGenMode] = useState<"text_only" | "reference" | "first_last">("text_only");
    const [imageUrls, setImageUrls] = useState<string[]>(["", ""]);

    const [aspectRatio, setAspectRatio] = useState("auto");
    const [resolution, setResolution] = useState("720p");
    const [duration, setDuration] = useState(5);
    const [videoCount, setVideoCount] = useState(1);
    const [generateAudio, setGenerateAudio] = useState(false);

    const [tasks, setTasks] = useState<VideoTask[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isSeedance15Pro = selectedModel?.label.includes("1.5") && selectedModel?.label.includes("Pro") && !selectedModel?.label.includes("Fast");
    const isSeedance10Pro = selectedModel?.label.includes("1.0") && selectedModel?.label.includes("Pro") && !selectedModel?.label.includes("Fast");
    const isSeedance10ProFast = selectedModel?.label.includes("1.0") && selectedModel?.label.includes("Pro") && selectedModel?.label.includes("Fast");
    const isOtherFast = selectedModel?.label.includes("Fast") && !isSeedance10ProFast;
    const isFast = selectedModel?.label.includes("Fast");
    const supportsFirstLast = isSeedance15Pro || isSeedance10Pro;
    const supportsAudio = isSeedance15Pro;

    useEffect(() => {
        if (!supportsAudio) setGenerateAudio(false);
        if (isOtherFast) {
            setDuration(Math.min(duration, 5));
        } else if (isSeedance15Pro) {
            setDuration(Math.max(duration, 4));
        }
        if (!supportsFirstLast && genMode === "first_last") {
            setGenMode("reference");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedModel]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [tasks]);

    const getProcessingTasksCount = () => {
        return tasks.filter(task => task.status === "processing").length;
    };

    const handleSubmit = async () => {
        if (!selectedModel || !prompt.trim()) return;

        const activeImages = imageUrls.filter(url => url.trim() !== "");

        if (genMode === "reference") {
            if (activeImages.length === 0) {
                toast.error("参考图模式需要至少一张图片URL");
                return;
            }
        } else if (genMode === "first_last") {
            if (activeImages.length < 2) {
                toast.error("首尾帧模式需要两张图片URL（首帧和尾帧）");
                return;
            }
        }

        const currentProcessingCount = getProcessingTasksCount();
        if (currentProcessingCount >= MAX_CONCURRENT_TASKS) {
            toast.error(`最多同时运行 ${MAX_CONCURRENT_TASKS} 个视频任务，请等待完成后再提交`);
            return;
        }

        const taskId = Date.now().toString();
        const submissionParams: SubmissionParams = {
            modelId: selectedModel.id,
            prompt: prompt,
            genMode: genMode,
            imageUrls: [...imageUrls],
            aspectRatio: aspectRatio,
            resolution: resolution,
            duration: duration,
            videoCount: videoCount,
            generateAudio: generateAudio,
        };

        const newTask: VideoTask = {
            id: taskId,
            prompt: prompt,
            platformName: selectedModel.platformName,
            modelLabel: selectedModel.label,
            status: "processing",
            progress: 5,
            params: submissionParams,
        };

        setTasks(prev => [...prev, newTask]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: Record<string, any> = {
            aspect_ratio: aspectRatio === "auto" ? "16:9" : aspectRatio,
            resolution: resolution,
            duration: duration,
            generate_audio: generateAudio,
            video_count: videoCount,
            mode: genMode,
        };

        if (activeImages.length > 0) {
            params.image_urls = activeImages;
        }

        try {
            const res = await fetch("/api/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apiConfigId: selectedModel.apiConfigId,
                    modelId: selectedModel.modelId,
                    prompt: prompt,
                    params
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                const errCode = data.detail?.error?.code || data.detail?.error_code || data.error_code || data.code || res.status.toString();
                const errMessage = data.detail?.error?.message || data.detail?.message || data.error || "生成请求失败";
                throw { code: errCode, message: errMessage, rawData: data };
            }

            pollResult(data.historyId, taskId);
        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as { code?: string; message: string; rawData?: any };
            setTasks(prev => prev.map(task =>
                task.id === taskId
                    ? { ...task, status: "failed", errorInfo: { code: error.code, message: error.message, rawData: error.rawData } }
                    : task
            ));
            toast.error(error.message);
        }

        setPrompt("");
        setImageUrls(["", ""]);
    };

    const pollResult = async (historyId: string, taskId: string) => {
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            if (attempts > 120) {
                clearInterval(interval);
                setTasks(prev => prev.map(task =>
                    task.id === taskId
                        ? { ...task, status: "failed", errorInfo: { message: "生成超时，请在历史记录中查看" } }
                        : task
                ));
                return;
            }

            try {
                const res = await fetch(`/api/proxy?historyId=${historyId}`);
                const data = await res.json();

                if (data.status === "completed") {
                    clearInterval(interval);
                    setTasks(prev => prev.map(task =>
                        task.id === taskId
                            ? { ...task, status: "completed", progress: 100, resultUrl: data.resultUrl }
                            : task
                    ));
                    toast.success("生成成功！");
                } else if (data.status === "failed") {
                    clearInterval(interval);
                    const rawResultData = data.resultData;
                    setTasks(prev => prev.map(task =>
                        task.id === taskId
                            ? {
                                ...task,
                                status: "failed",
                                errorInfo: {
                                    code: rawResultData?.error?.code || rawResultData?.error_code || rawResultData?.code || "GEN_ERROR",
                                    message: rawResultData?.error?.message || data.errorMsg || "生成失败",
                                    rawData: rawResultData
                                }
                            }
                            : task
                    ));
                } else {
                    setTasks(prev => prev.map(task =>
                        task.id === taskId
                            ? { ...task, progress: Math.min(task.progress + (task.progress < 90 ? 1 : 0.1), 98) }
                            : task
                    ));
                }
            } catch (e) {
                console.error("Polling error:", e);
            }
        }, 10000);
    };

    const retryTask = async (task: VideoTask) => {
        const currentProcessingCount = getProcessingTasksCount();
        if (currentProcessingCount >= MAX_CONCURRENT_TASKS) {
            toast.error(`最多同时运行 ${MAX_CONCURRENT_TASKS} 个视频任务，请等待完成后再重试`);
            return;
        }

        const model = models.find(m => m.id === task.params.modelId);
        if (!model) return;

        const taskId = Date.now().toString();
        const newTask: VideoTask = {
            ...task,
            id: taskId,
            status: "processing",
            progress: 5,
            resultUrl: undefined,
            errorInfo: undefined,
        };

        setTasks(prev => [...prev, newTask]);

        const activeImages = task.params.imageUrls.filter(url => url.trim() !== "");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: Record<string, any> = {
            aspect_ratio: task.params.aspectRatio === "auto" ? "16:9" : task.params.aspectRatio,
            resolution: task.params.resolution,
            duration: task.params.duration,
            generate_audio: task.params.generateAudio,
            video_count: task.params.videoCount,
            mode: task.params.genMode,
        };

        if (activeImages.length > 0) {
            params.image_urls = activeImages;
        }

        try {
            const res = await fetch("/api/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apiConfigId: model.apiConfigId,
                    modelId: model.modelId,
                    prompt: task.params.prompt,
                    params
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                const errCode = data.detail?.error?.code || data.detail?.error_code || data.error_code || data.code || res.status.toString();
                const errMessage = data.detail?.error?.message || data.detail?.message || data.error || "生成请求失败";
                throw { code: errCode, message: errMessage, rawData: data };
            }

            pollResult(data.historyId, taskId);
        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as { code?: string; message: string; rawData?: any };
            setTasks(prev => prev.map(t =>
                t.id === taskId
                    ? { ...t, status: "failed", errorInfo: { code: error.code, message: error.message, rawData: error.rawData } }
                    : t
            ));
            toast.error(error.message);
        }
    };

    const removeTaskFromStream = (taskId: string) => {
        setTasks(prev => prev.filter(task => task.id !== taskId));
    };

    return (
        <div className="flex flex-col h-screen bg-white text-gray-900 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-40 md:pb-48">
                {tasks.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <Video className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                            <p>输入提示词开始生成视频</p>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {tasks.map((task) => (
                            <div key={task.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-3 right-3 h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 z-10"
                                    onClick={() => removeTaskFromStream(task.id)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 pr-10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                                                    {task.platformName}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs border-gray-300 text-gray-500">
                                                    {task.modelLabel}
                                                </Badge>
                                                {task.status === "completed" ? (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                ) : task.status === "failed" ? (
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                ) : (
                                                    <Clock className="h-4 w-4 text-amber-500" />
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-900">{task.prompt}</p>
                                        </div>
                                        {task.status !== "processing" && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-gray-700 mr-10"
                                                onClick={() => retryTask(task)}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4">
                                    {task.status === "processing" && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-center">
                                                <div className="relative inline-block">
                                                    <div className="h-16 w-16 rounded-full border-4 border-violet-500/10 border-t-violet-500 animate-spin" />
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-sm font-bold text-violet-400">{Math.round(task.progress)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Progress value={task.progress} className="h-2 bg-gray-200" />
                                            <p className="text-center text-sm text-gray-500">AI 创作中...</p>
                                        </div>
                                    )}

                                    {task.status === "completed" && task.resultUrl && (
                                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                            <video
                                                src={task.resultUrl}
                                                controls
                                                className="w-full h-full object-contain bg-black"
                                                autoPlay
                                                loop
                                            />
                                        </div>
                                    )}

                                    {task.status === "completed" && !task.resultUrl && (
                                        <div className="flex flex-col items-center justify-center py-8 text-gray-500 space-y-4">
                                            <AlertCircle className="h-10 w-10 text-amber-500 opacity-50" />
                                            <p className="text-center text-sm font-medium">生成已完成</p>
                                            <p className="text-xs text-center">但未能直接获取视频流，请检查历史记录</p>
                                        </div>
                                    )}

                                    {task.status === "failed" && (
                                        <div className="space-y-4">
                                            <div className="flex flex-col items-center justify-center py-4">
                                                <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 mb-3">
                                                    <AlertCircle className="h-8 w-8 text-red-500" />
                                                </div>
                                                <p className="text-sm text-gray-700 text-center">{task.errorInfo?.message || "生成失败"}</p>
                                            </div>
                                            {!!task.errorInfo?.rawData && (
                                                <details className="group">
                                                    <summary className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                                                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                                                            <Type className="h-3 w-3" /> 查看详细信息
                                                        </span>
                                                        <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" />
                                                    </summary>
                                                    <div className="mt-3 space-y-2 border border-gray-200 bg-gray-50/50 rounded-lg p-3 text-left">
                                                        {task.errorInfo?.code && (
                                                            <div className="space-y-1">
                                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">错误码</span>
                                                                <Badge variant="outline" className="border-red-500/20 text-red-400 bg-red-500/5 text-xs">
                                                                    {task.errorInfo.code}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                        <div className="space-y-1">
                                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">原始响应</span>
                                                            <pre className="text-[10px] bg-black/40 p-2 rounded border border-gray-200/30 text-gray-400 overflow-auto max-h-[100px] custom-scrollbar font-mono leading-relaxed">
                                                                {JSON.stringify(task.errorInfo.rawData, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </details>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 md:left-72 right-0 p-3 md:p-4 z-50">
                <div className="max-w-4xl mx-auto">
                    <Card className="bg-white border-gray-200/50 rounded-2xl shadow-lg">
                        <CardContent className="p-0">
                            <div className="p-2 md:p-3">
                                <Select
                                    onValueChange={(val) => {
                                        const model = models.find(m => m.id === val);
                                        if (model) setSelectedModel(model);
                                    }}
                                    defaultValue={selectedModel?.id}
                                >
                                    <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl">
                                        <SelectValue placeholder="选择模型" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                                        {models.map((model) => (
                                            <SelectItem key={model.id} value={model.id}>
                                                {model.platformName} - {model.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2 p-2 md:p-3 bg-white overflow-x-auto">
                                <div className="flex bg-white rounded-lg p-1 flex-shrink-0">
                                    <div
                                        className={cn(
                                            "flex flex-col items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-md transition-all cursor-pointer",
                                            genMode === "text_only" ? "bg-gray-100 text-violet-400 shadow-sm" : "text-gray-500 hover:bg-gray-100/50"
                                        )}
                                        onClick={() => setGenMode("text_only")}
                                    >
                                        <Type className="h-3 w-3 md:h-4 md:w-4 mb-1" />
                                        <span className="text-[8px] md:text-[9px] font-medium">文生图</span>
                                    </div>
                                    <div className="w-[1px] bg-gray-100 my-1.5" />
                                    <div
                                        className={cn(
                                            "flex flex-col items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-md transition-all cursor-pointer",
                                            genMode === "reference" ? "bg-gray-100 text-violet-400 shadow-sm" : "text-gray-500 hover:bg-gray-100/50"
                                        )}
                                        onClick={() => setGenMode("reference")}
                                    >
                                        <ImageIcon className="h-3 w-3 md:h-4 md:w-4 mb-1" />
                                        <span className="text-[8px] md:text-[9px] font-medium">参考图</span>
                                    </div>
                                    <div className="w-[1px] bg-gray-100 my-1.5" />
                                    <div
                                        className={cn(
                                            "flex flex-col items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-md transition-all cursor-pointer",
                                            genMode === "first_last" ? "bg-gray-100 text-violet-400 shadow-sm" : "text-gray-500 hover:bg-gray-100/50",
                                            !supportsFirstLast && "opacity-50 cursor-not-allowed"
                                        )}
                                        onClick={() => supportsFirstLast && setGenMode("first_last")}
                                    >
                                        <Layers className="h-3 w-3 md:h-4 md:w-4 mb-1" />
                                        <span className="text-[8px] md:text-[9px] font-medium">首尾帧</span>
                                    </div>
                                </div>

                                {genMode !== "text_only" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-w-0">
                                        <div className="relative group">
                                            <Input
                                                placeholder={genMode === "first_last" ? "首帧图片 URL" : "输入图片 URL"}
                                                value={imageUrls[0]}
                                                onChange={(e) => {
                                                    const newUrls = [...imageUrls];
                                                    newUrls[0] = e.target.value;
                                                    setImageUrls(newUrls);
                                                }}
                                                className="bg-white border-gray-200 text-xs h-10 md:h-12 pl-2 md:pl-3 pr-6 md:pr-8 rounded-lg focus-visible:ring-violet-500/50"
                                            />
                                            {imageUrls[0] && (
                                                <X
                                                    className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-zinc-600 hover:text-gray-600 cursor-pointer"
                                                    onClick={() => {
                                                        const newUrls = [...imageUrls];
                                                        newUrls[0] = "";
                                                        setImageUrls(newUrls);
                                                    }}
                                                />
                                            )}
                                        </div>
                                        {genMode === "first_last" && (
                                            <div className="relative group animate-in slide-in-from-left-2 duration-300">
                                                <Input
                                                    placeholder="尾帧图片 URL"
                                                    value={imageUrls[1]}
                                                    onChange={(e) => {
                                                        const newUrls = [...imageUrls];
                                                        newUrls[1] = e.target.value;
                                                        setImageUrls(newUrls);
                                                    }}
                                                    className="bg-white border-gray-200 text-xs h-10 md:h-12 pl-2 md:pl-3 pr-6 md:pr-8 rounded-lg focus-visible:ring-violet-500/50"
                                                />
                                                {imageUrls[1] && (
                                                    <X
                                                        className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-zinc-600 hover:text-gray-600 cursor-pointer"
                                                        onClick={() => {
                                                            const newUrls = [...imageUrls];
                                                            newUrls[1] = "";
                                                            setImageUrls(newUrls);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="p-2 md:p-3">
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <Textarea
                                            placeholder="输入您想要生成的提示词，或结合参考图描述动态..."
                                            className="max-h-[200px] min-h-[80px] bg-transparent border border-gray-200 text-gray-900 text-sm p-3 resize-none focus-visible:ring-0 rounded-xl overflow-y-auto"
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-10 w-10 bg-white border-gray-200 rounded-xl">
                                                    <Settings2 className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-72 bg-white border-gray-200 shadow-xl rounded-2xl p-4">
                                                <div className="space-y-5">
                                                    <div className="space-y-3">
                                                        <Label className="text-gray-600 text-[11px] font-semibold uppercase tracking-wider">视频比例</Label>
                                                        <div className="grid grid-cols-4 gap-1.5">
                                                            {RATIOS.map((r) => (
                                                                <div
                                                                    key={r.value}
                                                                    className={cn(
                                                                        "flex flex-col items-center justify-center p-1.5 rounded-lg border border-gray-200 transition-all cursor-pointer",
                                                                        aspectRatio === r.value ? "bg-violet-600/10 border-violet-500/50 text-violet-400" : "hover:bg-gray-100/50 text-gray-500"
                                                                    )}
                                                                    onClick={() => setAspectRatio(r.value)}
                                                                >
                                                                    <span className="text-sm leading-none mb-0.5">{r.icon}</span>
                                                                    <span className="text-[9px]">{r.label}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <Label className="text-gray-600 text-[11px] font-semibold uppercase tracking-wider">分辨率</Label>
                                                        <div className="flex gap-1.5 p-0.5 bg-white rounded-lg">
                                                            {["480p", "720p", "1080p"].map(res => (
                                                                <Button
                                                                    key={res}
                                                                    variant="ghost"
                                                                    className={cn("flex-1 h-7 text-xs rounded-md transition-all", resolution === res ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-500")}
                                                                    onClick={() => setResolution(res)}
                                                                >
                                                                    {res}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <Label className="text-gray-600 text-[11px] font-semibold uppercase tracking-wider">视频时长</Label>
                                                            <span className="text-violet-400 text-xs font-bold">{duration} 秒</span>
                                                        </div>
                                                        <Slider
                                                            value={[duration]}
                                                            min={isSeedance15Pro && !isFast ? 4 : 2}
                                                            max={isOtherFast ? 5 : 12}
                                                            step={1}
                                                            onValueChange={v => setDuration(v[0])}
                                                        />
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <Label className="text-gray-600 text-[11px] font-semibold uppercase tracking-wider">选择生成数量</Label>
                                                            <span className="text-gray-900 text-xs">{videoCount} 条</span>
                                                        </div>
                                                        <Slider
                                                            value={[videoCount]}
                                                            min={1}
                                                            max={4}
                                                            step={1}
                                                            onValueChange={v => setVideoCount(v[0])}
                                                        />
                                                    </div>

                                                    {supportsAudio && (
                                                        <div className="pt-1">
                                                            <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200/50">
                                                                <div className="flex items-center gap-2">
                                                                    <Volume2 className="h-3.5 w-3.5 text-violet-400" />
                                                                    <div className="flex flex-col">
                                                                        <Label htmlFor="pop-audio-playground" className="text-xs font-medium">输出伴随音效</Label>
                                                                        <span className="text-[9px] text-gray-500">AI 自动生成背景音</span>
                                                                    </div>
                                                                </div>
                                                                <Checkbox
                                                                    id="pop-audio-playground"
                                                                    checked={generateAudio}
                                                                    onCheckedChange={(v: boolean | "indeterminate") => setGenerateAudio(v === true)}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </PopoverContent>
                                        </Popover>

                                        <Button
                                            onClick={handleSubmit}
                                            disabled={!selectedModel || !prompt.trim()}
                                            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 w-10 p-0 flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-100"
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
