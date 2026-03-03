import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Share2, ShieldCheck, Zap, BookOpen } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b border-gray-200 backdrop-blur-md sticky top-0 z-50 bg-white/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">ModelHosting</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/docs">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 transition flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              文档
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 transition">登录</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white transition px-6">立即注册</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-5xl mx-auto space-y-12">
        <div className="space-y-6">
          <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 px-4 py-1.5 text-sm mb-4">
            <Sparkles className="h-3.5 w-3.5 mr-2" /> 专业的Seedance代理分发与多租户管理
          </Badge>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tighter leading-tight text-gray-900">
            一站式管理和应用您的模型
          </h1>
          <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            专为视频模型设计，安全加密密钥，一键授权他人，从网页端直接创作。
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-20 w-full text-left">
          <div className="p-8 rounded-2xl border border-gray-200 bg-gray-50 space-y-4">
            <div className="p-3 bg-blue-500/10 rounded-xl w-fit">
              <ShieldCheck className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold">银行级安全加密</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              所有 API Key 使用 AES-256-GCM 硬件加速算法加密。密钥永远不离开服务器，前端无感知，彻底杜绝泄漏风险。
            </p>
          </div>
          <div className="p-8 rounded-2xl border border-gray-200 bg-gray-50 space-y-4">
            <div className="p-3 bg-violet-500/10 rounded-xl w-fit">
              <Share2 className="h-6 w-6 text-violet-500" />
            </div>
            <h3 className="text-xl font-bold">极简权限分发</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              无需繁杂配置，输入对方邮箱或生成专属邀请链接，即可完成模型权限授予。支持随时查看用量并一键撤销。
            </p>
          </div>
          <div className="p-8 rounded-2xl border border-gray-200 bg-gray-50 space-y-4">
            <div className="p-3 bg-amber-500/10 rounded-xl w-fit">
              <Zap className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold">沉浸式创作空间</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              支持 Seedance 等多模态模型。内置视频播放器、实时进度条和历史记录管理，为您提供丝滑的 AI 交互体验。
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-12 border-t border-gray-200 text-center text-gray-500 text-sm mt-20">
        © 2026 ModelHosting. Built for AI Pioneers.
      </footer>
    </div>
  );
}

// Inline Badge component for the landing page
function Badge({ className, children }: { className: string, children: React.ReactNode }) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
}
