"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
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

import { Suspense } from "react";

const formSchema = z.object({
    email: z.string().email("无效的电子邮箱"),
    password: z.string().min(1, "请输入密码"),
});

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            const result = await signIn("credentials", {
                email: values.email,
                password: values.password,
                redirect: false,
            });

            if (result?.error) {
                toast.error("登录失败，请检查邮箱和密码");
            } else {
                toast.success("登录成功！");
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (error) {
            toast.error("登录时发生错误");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-sm border-gray-200 bg-white text-gray-900">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">欢迎回来</CardTitle>
                    <CardDescription className="text-gray-600">
                        登录您的 ModelHosting 账户
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                        <div className="flex items-center justify-between">
                                            <FormLabel>密码</FormLabel>
                                            <Link href="/forgot-password" title="还没调通，暂不可用" className="text-xs text-indigo-600 hover:underline">
                                                忘记密码？
                                            </Link>
                                        </div>
                                        <FormControl>
                                            <Input type="password" {...field} className="bg-gray-100 border-gray-300" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 cursor-pointer" disabled={loading}>
                                {loading ? "登录中..." : "立即登录"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-wrap items-center justify-center gap-2">
                    <div className="text-sm text-gray-600">
                        没有账户？{" "}
                        <Link href="/register" className="text-indigo-600 hover:underline">
                            注册新账户
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-sm border-gray-200 bg-white text-gray-900 p-8 text-center fleex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </Card>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
