"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Send,
    Loader2,
    Video,
    RefreshCw,
    AlertCircle,
    Sparkles,
    Wand2,
    Image as ImageIcon,
    Settings2,
    X,
    ChevronDown,
    History,
    Volume2,
    Type,
    Layers,
    Clock,
    Maximize2,
    Share2
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

const RATIOS = [
    { label: "21:9", value: "21:9", icon: "▭" },
    { label: "16:9", value: "16:9", icon: "▭" },
    { label: "4:3", value: "4:3", icon: "□" },
    { label: "1:1", value: "1:1", icon: "□" },
    { label: "3:4", value: "3:4", icon: "▯" },
    { label: "9:16", value: "9:16", icon: "▯" },
    { label: "智能", value: "auto", icon: "" },
];

export function PlaygroundClient({ models }: { models: PlaygroundModel[] }) {
    const router = useRouter();
    const [selectedModel, setSelectedModel] = useState<PlaygroundModel | null>(models[0] || null);
    const [prompt, setPrompt] = useState("");
    const [genMode, setGenMode] = useState<"text_only" | "reference" | "first_last">("text_only");
    const [imageUrls, setImageUrls] = useState<string[]>(["", ""]);

    const [aspectRatio, setAspectRatio] = useState("auto");
    const [resolution, setResolution] = useState("720p");
    const [duration, setDuration] = useState(5);
    const [videoCount, setVideoCount] = useState(1);
    const [generateAudio, setGenerateAudio] = useState(false);

    const [lastSubmittedParams, setLastSubmittedParams] = useState<SubmissionParams | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [errorInfo, setErrorInfo] = useState<{ code?: string; message: string; rawData?: any } | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);

    const isSeedance15Pro = selectedModel?.label.includes("1.5") && selectedModel?.label.includes("Pro") && !selectedModel?.label.includes("Fast");
    const isSeedance10Pro = selectedModel?.label.includes("1.0") && selectedModel?.label.includes("Pro") && !selectedModel?.label.includes("Fast");
    const isFast = selectedModel?.label.includes("Fast");
    const supportsFirstLast = isSeedance15Pro || isSeedance10Pro;
    const supportsAudio = isSeedance15Pro;

    useEffect(() => {
        if (!supportsAudio) setGenerateAudio(false);
        if (isFast) {
            setDuration(Math.min(duration, 5));
        } else if (isSeedance15Pro) {
            setDuration(Math.max(duration, 4));
        }
        if (!supportsFirstLast && genMode === "first_last") {
            setGenMode("reference");
        }
    }, [selectedModel]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('playground_last_submission');
            if (saved) {
                const data = JSON.parse(saved);
                setLastSubmittedParams(data);
            }
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
        }
    }, []);

    const handleSubmit = async (retryData?: SubmissionParams | null) => {
        let targetModel = selectedModel;
        let targetPrompt = prompt;
        let targetGenMode = genMode;
        let targetImageUrls = [...imageUrls];
        let targetAspectRatio = aspectRatio;
        let targetResolution = resolution;
        let targetDuration = duration;
        let targetVideoCount = videoCount;
        let targetGenerateAudio = generateAudio;

        if (retryData) {
            if (retryData.modelId) {
                const model = models.find(m => m.id === retryData.modelId);
                if (model) {
                    targetModel = model;
                    setSelectedModel(model);
                }
            }
            if (retryData.prompt !== undefined) targetPrompt = retryData.prompt;
            if (retryData.genMode !== undefined) targetGenMode = retryData.genMode;
            if (retryData.imageUrls !== undefined) targetImageUrls = retryData.imageUrls;
            if (retryData.aspectRatio !== undefined) targetAspectRatio = retryData.aspectRatio;
            if (retryData.resolution !== undefined) targetResolution = retryData.resolution;
            if (retryData.duration !== undefined) targetDuration = retryData.duration;
            if (retryData.videoCount !== undefined) targetVideoCount = retryData.videoCount;
            if (retryData.generateAudio !== undefined) targetGenerateAudio = retryData.generateAudio;

            setPrompt(targetPrompt);
            setGenMode(targetGenMode);
            setImageUrls(targetImageUrls);
            setAspectRatio(targetAspectRatio);
            setResolution(targetResolution);
            setDuration(targetDuration);
            setVideoCount(targetVideoCount);
            setGenerateAudio(targetGenerateAudio);
        }

        if (!targetModel || !targetPrompt.trim()) return;

        const activeImages = targetImageUrls.filter(url => url.trim() !== "");
        
        if (targetGenMode === "reference") {
            if (activeImages.length === 0) {
                toast.error("参考图模式需要至少一张图片URL");
                return;
            }
        } else if (targetGenMode === "first_last") {
            if (activeImages.length < 2) {
                toast.error("首尾帧模式需要两张图片URL（首帧和尾帧）");
                return;
            }
        }

        setLoading(true);
        setStatus("processing");
        setResult(null);
        setErrorInfo(null);
        setProgress(5);

        const params: any = {
            aspect_ratio: targetAspectRatio === "auto" ? "16:9" : targetAspectRatio,
            resolution: targetResolution,
            duration: targetDuration,
            generate_audio: targetGenerateAudio,
            video_count: targetVideoCount,
            mode: targetGenMode,
        };

        if (activeImages.length > 0) {
            params.image_urls = activeImages;
        }

        const submissionData: SubmissionParams = {
            modelId: targetModel.id,
            prompt: targetPrompt,
            genMode: targetGenMode,
            imageUrls: [...targetImageUrls],
            aspectRatio: targetAspectRatio,
            resolution: targetResolution,
            duration: targetDuration,
            videoCount: targetVideoCount,
            generateAudio: targetGenerateAudio,
        };
        setLastSubmittedParams(submissionData);
        try {
            localStorage.setItem('playground_last_submission', JSON.stringify(submissionData));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }

        try {
            const res = await fetch("/api/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apiConfigId: targetModel.apiConfigId,
                    modelId: targetModel.modelId,
                    prompt: targetPrompt,
                    params
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                const errCode = data.detail?.error?.code || data.detail?.error_code || data.error_code || data.code || res.status.toString();
                const errMessage = data.detail?.error?.message || data.detail?.message || data.error || "生成请求失败";
                throw { code: errCode, message: errMessage, rawData: data };
            }

            setProgress(20);
            pollResult(data.historyId);
        } catch (err: any) {
            setErrorInfo({ 
                code: err.code, 
                message: err.message,
                rawData: err.rawData 
            });
            setStatus("failed");
            setLoading(false);
            toast.error(err.message);
        }
    };

    const pollResult = async (id: string) => {
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            if (attempts > 120) {
                clearInterval(interval);
                setStatus("failed");
                setLoading(false);
                setErrorInfo({ message: "生成超时，请在历史记录中查看" });
                return;
            }

            try {
                const res = await fetch(`/api/proxy?historyId=${id}`);
                const data = await res.json();

                if (data.status === "completed") {
                    clearInterval(interval);
                    setResult(data);
                    setStatus("completed");
                    setLoading(false);
                    setProgress(100);
                    toast.success("生成成功！");
                } else if (data.status === "failed") {
                    clearInterval(interval);
                    setStatus("failed");
                    setLoading(false);
                    const rawResultData = data.resultData;
                    setErrorInfo({
                        code: rawResultData?.error?.code || rawResultData?.error_code || rawResultData?.code || "GEN_ERROR",
                        message: rawResultData?.error?.message || data.errorMsg || "生成失败",
                        rawData: rawResultData
                    });
                } else {
                    setProgress(prev => Math.min(prev + (prev < 90 ? 1 : 0.1), 98));
                }
            } catch (e) {
                console.error("Polling error:", e);
            }
        }, 10000);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 text-gray-900 overflow-hidden">
            <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col">
                    <div className="p-4 md:p-6 border-b border-gray-200/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <p className="text-gray-600 text-sm hidden md:block">选择 Seedance 系列大模型，开启您的视觉创作之旅</p>
                            </div>
                            <Select
                                onValueChange={(val) => {
                                    const model = models.find(m => m.id === val);
                                    if (model) setSelectedModel(model);
                                }}
                                defaultValue={selectedModel?.id}
                            >
                                <SelectTrigger className="w-[400px] bg-white/50 border-gray-200 rounded-xl">
                                    <SelectValue placeholder="选择模型" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200 text-gray-900 w-[400px]">
                                    {models.map((model) => (
                                        <SelectItem key={model.id} value={model.id}>
                                            {model.platformName} - {model.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                        <div className="w-full mx-auto px-4">
                            <Card className="bg-white border-gray-200/50 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
                                <CardContent className="p-0">

                                    <div className="flex items-center gap-3 md:gap-4 p-4 md:p-6 border-b border-gray-200/50 bg-white/20 overflow-x-auto">
                                        <div className="flex bg-white rounded-lg p-1 flex-shrink-0">
                                            <div
                                                className={cn(
                                                    "flex flex-col items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-md transition-all cursor-pointer",
                                                    genMode === "text_only" ? "bg-gray-100 text-violet-400 shadow-sm" : "text-gray-500 hover:bg-gray-100/50"
                                                )}
                                                onClick={() => setGenMode("text_only")}
                                            >
                                                <Type className="h-4 w-4 md:h-5 md:w-5 mb-1" />
                                                <span className="text-[9px] md:text-[10px] font-medium">文生图</span>
                                            </div>
                                            <div className="w-[1px] bg-gray-100 my-2" />
                                            <div
                                                className={cn(
                                                    "flex flex-col items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-md transition-all cursor-pointer",
                                                    genMode === "reference" ? "bg-gray-100 text-violet-400 shadow-sm" : "text-gray-500 hover:bg-gray-100/50"
                                                )}
                                                onClick={() => setGenMode("reference")}
                                            >
                                                <ImageIcon className="h-4 w-4 md:h-5 md:w-5 mb-1" />
                                                <span className="text-[9px] md:text-[10px] font-medium">参考图</span>
                                            </div>
                                            <div className="w-[1px] bg-gray-100 my-2" />
                                            <div
                                                className={cn(
                                                    "flex flex-col items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-md transition-all cursor-pointer",
                                                    genMode === "first_last" ? "bg-gray-100 text-violet-400 shadow-sm" : "text-gray-500 hover:bg-gray-100/50",
                                                    !supportsFirstLast && "opacity-50 cursor-not-allowed"
                                                )}
                                                onClick={() => supportsFirstLast && setGenMode("first_last")}
                                            >
                                                <Layers className="h-4 w-4 md:h-5 md:w-5 mb-1" />
                                                <span className="text-[9px] md:text-[10px] font-medium">首尾帧</span>
                                            </div>
                                        </div>

                                        {genMode !== "text_only" && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-w-0">
                                                <div className="relative group">
                                                    <Input
                                                        placeholder={genMode === "first_last" ? "首帧图片 URL" : "输入图片 URL"}
                                                        value={imageUrls[0]}
                                                        onChange={(e) => {
                                                            const newUrls = [...imageUrls];
                                                            newUrls[0] = e.target.value;
                                                            setImageUrls(newUrls);
                                                        }}
                                                        className="bg-white border-gray-200 text-xs h-12 md:h-14 pl-3 md:pl-4 pr-8 md:pr-10 rounded-xl focus-visible:ring-violet-500/50"
                                                    />
                                                    {imageUrls[0] && (
                                                        <X
                                                            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-zinc-600 hover:text-gray-600 cursor-pointer"
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
                                                            className="bg-white border-gray-200 text-xs h-12 md:h-14 pl-3 md:pl-4 pr-8 md:pr-10 rounded-xl focus-visible:ring-violet-500/50"
                                                        />
                                                        {imageUrls[1] && (
                                                            <X
                                                                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-zinc-600 hover:text-gray-600 cursor-pointer"
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

                                    <div className="relative p-3 md:p-4">
                                        <Textarea
                                            placeholder="输入您想要生成的提示词，或结合参考图描述动态..."
                                            className="min-h-[150px] md:min-h-[200px] bg-transparent border-none text-gray-900 text-base md:text-lg p-4 md:p-6 resize-none focus-visible:ring-0 leading-relaxed custom-scrollbar"
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            disabled={loading}
                                        />

                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 pt-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="sm" className="bg-white/50 border-gray-200 text-gray-600 hover:text-gray-900 rounded-lg h-8 md:h-9">
                                                            <span className="flex items-center gap-2 px-1 text-xs">
                                                                <Settings2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                                                {aspectRatio === "auto" ? "智能比例" : aspectRatio} · {resolution} · {duration}秒 · {videoCount}条
                                                                <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3 opacity-50" />
                                                            </span>
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 bg-white border-gray-200 shadow-2xl rounded-2xl p-6">
                                                        <div className="space-y-8">
                                                            <div className="space-y-4">
                                                                <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">视频比例</Label>
                                                                <div className="grid grid-cols-4 gap-2">
                                                                    {RATIOS.map((r) => (
                                                                        <div
                                                                            key={r.value}
                                                                            className={cn(
                                                                                "flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 transition-all cursor-pointer",
                                                                                aspectRatio === r.value ? "bg-violet-600/10 border-violet-500/50 text-violet-400" : "hover:bg-gray-100/50 text-gray-500"
                                                                            )}
                                                                            onClick={() => setAspectRatio(r.value)}
                                                                        >
                                                                            <span className="text-lg leading-none mb-1">{r.icon}</span>
                                                                            <span className="text-[10px]">{r.label}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">分辨率</Label>
                                                                <div className="flex gap-2 p-1 bg-white rounded-xl">
                                                                    {["480p", "720p", "1080p"].map(res => (
                                                                        <Button
                                                                            key={res}
                                                                            variant="ghost"
                                                                            className={cn("flex-1 h-8 text-xs rounded-lg transition-all", resolution === res ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-500")}
                                                                            onClick={() => setResolution(res)}
                                                                        >
                                                                            {res}
                                                                        </Button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-6">
                                                                <div className="flex justify-between items-center">
                                                                    <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">视频时长</Label>
                                                                    <span className="text-violet-400 text-xs font-bold">{duration} 秒</span>
                                                                </div>
                                                                <Slider
                                                                    value={[duration]}
                                                                    min={isSeedance15Pro && !isFast ? 4 : 2}
                                                                    max={isFast ? 5 : 12}
                                                                    step={1}
                                                                    onValueChange={v => setDuration(v[0])}
                                                                />
                                                            </div>

                                                            <div className="space-y-4">
                                                                <div className="flex justify-between items-center">
                                                                    <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">选择生成数量</Label>
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

                                                            <div className="pt-2">
                                                                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200/50">
                                                                    <div className="flex items-center gap-3">
                                                                        <Volume2 className="h-4 w-4 text-violet-400" />
                                                                        <div className="flex flex-col">
                                                                            <Label htmlFor="pop-audio" className="text-sm font-medium">输出伴随音效</Label>
                                                                            <span className="text-[10px] text-gray-500">AI 自动生成背景音</span>
                                                                        </div>
                                                                    </div>
                                                                    <Checkbox
                                                                        id="pop-audio"
                                                                        checked={generateAudio}
                                                                        onCheckedChange={(v: any) => setGenerateAudio(v)}
                                                                        disabled={!supportsAudio}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>

                                                {generateAudio && (
                                                    <Badge className="bg-violet-600/20 text-violet-400 border-none px-2 py-1 rounded-md flex gap-1 items-center animate-in zoom-in-50">
                                                        <Volume2 className="h-3 w-3" /> 输出声音
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 sm:gap-4">
                                                <Button
                                                    onClick={() => handleSubmit()}
                                                    disabled={loading || !prompt.trim()}
                                                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 sm:px-6 h-10 sm:h-12 shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:scale-105 active:scale-100 flex-shrink-0"
                                                >
                                                    {loading ? (
                                                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                                                    ) : (
                                                        <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {(status !== "idle") && (
                        <div className="flex items-center justify-center p-4 md:p-8 border-t border-gray-200/50">
                            <div className="w-full px-4">
                                <Card className="bg-gray-50 border-gray-200/50 rounded-2xl overflow-hidden relative group">
                                    <div className="absolute top-4 right-4 z-10">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 bg-black/60 text-gray-600 hover:text-white hover:bg-black/80"
                                            onClick={() => setStatus("idle")}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="w-full flex items-center justify-center bg-black min-h-[300px] md:min-h-[400px]">
                                        {status === "processing" && (
                                            <div className="w-full max-w-sm px-8 md:px-12 space-y-6 md:space-y-8 text-center animate-in zoom-in-95">
                                                <div className="relative inline-block">
                                                    <div className="h-24 w-24 md:h-32 md:w-32 rounded-full border-[6px] border-violet-500/10 border-t-violet-500 animate-spin" />
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-xl md:text-2xl font-black text-violet-400">{Math.round(progress)}%</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-bold text-gray-900 text-lg md:text-xl tracking-tight">AI 创作中...</h4>
                                                        <Progress value={progress} className="h-2 bg-white overflow-hidden" />
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-medium">Processing your visual prompt</p>
                                                </div>
                                            </div>
                                        )}

                                        {status === "completed" && result && (
                                            <div className="w-full h-full animate-in fade-in duration-500">
                                                {result.resultUrl ? (
                                                    <video
                                                        ref={videoRef}
                                                        src={result.resultUrl}
                                                        controls
                                                        className="w-full max-h-[600px] object-contain bg-black"
                                                        autoPlay
                                                        loop
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4 p-8 md:p-12">
                                                        <AlertCircle className="h-12 w-12 md:h-16 md:w-16 text-amber-500 opacity-50" />
                                                        <p className="text-center font-medium">生成已完成</p>
                                                        <p className="text-xs text-zinc-600 text-center">但未能直接获取视频流，请检查历史记录或原始响应。</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {status === "failed" && (
                                            <div className="w-full h-full bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 md:p-12 space-y-6 animate-in zoom-in-95">
                                                <div className="bg-red-500/10 p-4 md:p-6 rounded-3xl border border-red-500/20">
                                                    <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-red-500" />
                                                </div>
                                                <div className="text-center space-y-4 max-w-[400px] w-full">
                                                    <h4 className="text-lg md:text-xl font-bold text-red-100">生成任务中断</h4>
                                                    <p className="text-sm text-gray-700 leading-relaxed">{errorInfo?.message || "火山引擎 API 暂时无法响应您的请求"}</p>
                                                    <details className="group w-full">
                                                        <summary className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-gray-200/50 cursor-pointer hover:bg-gray-100/50 transition-colors">
                                                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                                                                <Type className="h-3 w-3" /> 查看详细信息
                                                            </span>
                                                            <ChevronDown className="h-4 w-4 text-zinc-600 transition-transform group-open:rotate-180" />
                                                        </summary>
                                                        <div className="mt-4 space-y-3 border border-gray-200/50 bg-white/30 rounded-xl p-4 text-left">
                                                            {errorInfo?.code && (
                                                                <div className="space-y-1">
                                                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">错误码</span>
                                                                    <Badge variant="outline" className="border-red-500/20 text-red-400 bg-red-500/5 text-sm">
                                                                        {errorInfo.code}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                            {errorInfo?.rawData && (
                                                                <div className="space-y-1">
                                                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">原始响应</span>
                                                                    <pre className="text-[10px] bg-black/40 p-3 rounded-lg border border-gray-200/30 text-gray-500 overflow-auto max-h-[120px] custom-scrollbar font-mono leading-relaxed">
                                                                        {JSON.stringify(errorInfo.rawData, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </details>
                                                </div>

                                                <div className="pt-4 flex gap-3">
                                                    <Button
                                                        onClick={() => setStatus("idle")}
                                                        variant="outline"
                                                        className="border-gray-200 bg-white/50 rounded-xl"
                                                    >
                                                        放弃
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleSubmit(lastSubmittedParams)}
                                                        className="bg-zinc-100 text-black hover:bg-white rounded-xl font-bold px-4 md:px-6"
                                                    >
                                                        <RefreshCw className="mr-2 h-4 w-4" /> 一键重新尝试
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {status === "completed" && (
                                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <Badge className="bg-black/60 backdrop-blur-md border-gray-200 text-gray-700">
                                                {selectedModel?.label}
                                            </Badge>
                                            <div className="flex gap-2">
                                                <Button size="icon-sm" variant="outline" className="bg-black/60 border-gray-200 rounded-full" onClick={() => handleSubmit(lastSubmittedParams)}>
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
