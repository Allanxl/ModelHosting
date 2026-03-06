"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
    name: z.string().min(2, "姓名至少2个字符"),
    email: z.string().email("无效的电子邮箱"),
    password: z.string().min(8, "密码至少8个字符"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
});

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: values.name,
                    email: values.email,
                    password: values.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "注册失败");
            }

            toast.success("注册成功！即将跳转至登录页面");
            setTimeout(() => router.push("/login"), 2000);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "发生未知错误");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-sm border-gray-200 bg-white text-gray-900">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">创建账户</CardTitle>
                    <CardDescription className="text-gray-600">
                        加入 ModelHosting，开始管理您的 AI API
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>姓名</FormLabel>
                                        <FormControl>
                                            <Input placeholder="张三" {...field} className="bg-gray-100 border-gray-300" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>邮箱</FormLabel>
                                        <FormControl>
                                            <Input placeholder="name@example.com" {...field} className="bg-gray-100 border-gray-300" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>密码</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} className="bg-gray-100 border-gray-300" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>确认密码</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} className="bg-gray-100 border-gray-300" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 cursor-pointer" disabled={loading}>
                                {loading ? "注册中..." : "立即注册"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-gray-600">
                        已有账户？{" "}
                        <Link href="/login" className="text-indigo-600 hover:underline">
                            登录
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
