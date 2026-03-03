"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Database, Save, Info, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
    platformName: z.string().min(1, "请输入平台名称"),
    baseUrl: z.string().url("请输入有效的 URL 地址"),
    apiKey: z.string().min(1, "请输入 API Key"),
    dailyVideoLimit: z.number().int().min(1).max(10000),
    models: z.array(z.object({
        modelId: z.string().min(1, "Endpoint ID 必填"),
        label: z.string().min(1, "显示名称必填"),
    })).min(1, "至少添加一个模型"),
});

const VOLCANO_PRESETS = [
    { id: "seedance-2.0", label: "Seedance 2.0" },
    { id: "seedance-1.5-pro", label: "Seedance 1.5 Pro" },
    { id: "seedance-1.0-pro", label: "Seedance 1.0 Pro" },
    { id: "seedance-1.0-pro-fast", label: "Seedance 1.0 Pro Fast" },
];

export default function NewApiPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            platformName: "火山引擎",
            baseUrl: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
            apiKey: "",
            dailyVideoLimit: 50,
            models: [{ modelId: "", label: "Seedance 2.0" }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "models",
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            const res = await fetch("/api/apis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "保存失败");

            toast.success("API 配置已保存");
            router.push("/apis");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <Link href="/apis">
                    <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="mr-2 h-4 w-4" /> 返回列表
                    </Button>
                </Link>
                <h2 className="text-2xl font-bold text-gray-900">新增火山引擎配置</h2>
                <div className="w-20" />
            </div>

            <Alert className="mb-6 bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
                <Info className="h-4 w-4" />
                <AlertTitle>火山引擎集成</AlertTitle>
                <AlertDescription>
                    请输入您在火山方舟 (Ark) 平台创建的推理接入点 (Endpoint ID)，系统将自动适配 Seedance 模型的生成参数。
                </AlertDescription>
            </Alert>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card className="border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5 text-indigo-500" />
                                基础信息
                            </CardTitle>
                            <CardDescription className="text-gray-600">配置火山方舟的 API 访问凭证</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="platformName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>平台名称</FormLabel>
                                            <FormControl>
                                                <Input {...field} className="bg-gray-100 border-gray-300" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dailyVideoLimit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>每日生成限额 (次)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={e => field.onChange(parseInt(e.target.value))}
                                                    className="bg-gray-100 border-gray-300"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="baseUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>API Base URL</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled className="bg-gray-100 border-gray-300 font-medium text-gray-600 cursor-not-allowed" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="apiKey"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>API Key (Ark Key)</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="sk-..." {...field} className="bg-gray-100 border-gray-300 font-mono" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 bg-white">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-violet-500" />
                                    推理接入点 (Endpoints)
                                </CardTitle>
                                <CardDescription className="text-gray-600">
                                    添加您在火山方舟部署的 Seedance 接入点 ID
                                </CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                                onClick={() => append({ modelId: "", label: "" })}
                            >
                                <Plus className="mr-2 h-4 w-4" /> 添加接入点
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-gray-200 pb-4 last:border-0">
                                    <div className="md:col-span-4">
                                        <FormField
                                            control={form.control}
                                            name={`models.${index}.label`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className={index > 0 ? "sr-only" : ""}>模型版本</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="bg-gray-100 border-gray-300">
                                                                <SelectValue placeholder="选择模型版本" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-white border-gray-200 text-gray-900">
                                                            {VOLCANO_PRESETS.map(p => (
                                                                <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="md:col-span-7">
                                        <FormField
                                            control={form.control}
                                            name={`models.${index}.modelId`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className={index > 0 ? "sr-only" : ""}>接入点 ID (Endpoint ID)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="ep-2024..." {...field} className="bg-gray-100 border-gray-300 font-mono" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-gray-500 hover:text-red-500"
                                            onClick={() => remove(index)}
                                            disabled={fields.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href="/apis">
                            <Button variant="ghost">取消</Button>
                        </Link>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-8" disabled={loading}>
                            {loading ? "保存中..." : <><Save className="mr-2 h-4 w-4" /> 保存配置</>}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
