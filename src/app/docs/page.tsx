import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Share2, BookOpen, User, PlayCircle, Database } from "lucide-react";

export default function DocsPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white text-gray-900">
            <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b border-gray-200 backdrop-blur-md sticky top-0 z-50 bg-white/80">
                <Link href="/" className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg">
                        <Share2 className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">ModelHosting</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" className="text-gray-600 hover:text-gray-900 transition">
                            返回首页
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-6 lg:p-12">
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <BookOpen className="h-8 w-8 text-indigo-600" />
                        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight">使用文档</h1>
                    </div>
                    <p className="text-lg text-gray-600">
                        欢迎使用 ModelHosting，本指南将帮助您快速上手所有功能。
                    </p>
                </div>

                <div className="space-y-12">
                    <section id="account" className="scroll-mt-24">
                        <div className="flex items-center gap-3 mb-6">
                            <User className="h-6 w-6 text-indigo-600" />
                            <h2 className="text-2xl font-bold">账号管理</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                                <h3 className="text-xl font-semibold mb-3">注册账号</h3>
                                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                    <li>点击首页右上角的「立即注册」按钮</li>
                                    <li>填写您的邮箱、用户名和密码</li>
                                    <li>点击「注册」完成账号创建</li>
                                    <li>注册成功后会自动跳转到登录页面</li>
                                </ol>
                            </div>

                            <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                                <h3 className="text-xl font-semibold mb-3">登录</h3>
                                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                    <li>点击首页右上角的「登录」按钮</li>
                                    <li>输入您注册时使用的邮箱和密码</li>
                                    <li>点击「立即登录」进入系统</li>
                                </ol>
                            </div>

                            <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                                <h3 className="text-xl font-semibold mb-3">找回密码</h3>
                                <p className="text-gray-700">
                                    密码找回功能即将上线，敬请期待。
                                </p>
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-200" />

                    <section id="model" className="scroll-mt-24">
                        <div className="flex items-center gap-3 mb-6">
                            <Database className="h-6 w-6 text-indigo-600" />
                            <h2 className="text-2xl font-bold">模型管理</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                                <h3 className="text-xl font-semibold mb-3">绑定 API 配置</h3>
                                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                    <li>登录后进入「配置」页面</li>
                                    <li>点击「新增 API」按钮</li>
                                    <li>平台名称默认设置为「火山引擎」（不可修改）</li>
                                    <li>API Base URL 已默认配置（不可修改）</li>
                                    <li>输入您的火山引擎 API Key</li>
                                    <li>设置每日生成限额（默认为 50 次）</li>
                                    <li>添加推理接入点（Endpoint），选择模型版本并输入接入点 ID</li>
                                    <li>点击「保存配置」完成绑定</li>
                                </ol>
                            </div>

                            <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                                <h3 className="text-xl font-semibold mb-3">编辑 API 配置</h3>
                                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                    <li>在「配置」页面找到需要编辑的配置</li>
                                    <li>点击右侧菜单中的「编辑」</li>
                                    <li>您可以修改：每日限额、API Key（留空则不修改）、推理接入点</li>
                                    <li>平台名称和 API Base URL 不可修改</li>
                                    <li>修改完成后点击「保存修改」</li>
                                </ol>
                            </div>

                            <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                                <h3 className="text-xl font-semibold mb-3">分享模型权限</h3>
                                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                    <li>在「配置」页面找到要分享的配置</li>
                                    <li>点击右侧菜单，选择「邮件授权」或「生成邀请链接」</li>
                                    <li>邮件授权：输入对方邮箱，点击确认即可直接授予权限</li>
                                    <li>生成邀请链接：复制链接发送给其他用户，点击链接即可获得权限</li>
                                </ol>
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-200" />

                    <section id="usage" className="scroll-mt-24">
                        <div className="flex items-center gap-3 mb-6">
                            <PlayCircle className="h-6 w-6 text-indigo-600" />
                            <h2 className="text-2xl font-bold">模型使用</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                                <h3 className="text-xl font-semibold mb-3">生成视频</h3>
                                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                    <li>进入「生成」页面</li>
                                    <li>在顶部选择要使用的模型</li>
                                    <li>（可选）输入参考图 URL 或首尾帧图片 URL</li>
                                    <li>在输入框中输入您的提示词（Prompt）</li>
                                    <li>点击设置按钮可以调整：视频比例、分辨率、时长、生成数量、是否生成音频</li>
                                    <li>点击发送按钮开始生成</li>
                                    <li>等待生成完成，视频会自动在下方显示</li>
                                </ol>
                            </div>

                            <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                                <h3 className="text-xl font-semibold mb-3">查看和管理资产</h3>
                                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                    <li>进入「资产」页面查看所有生成记录</li>
                                    <li>可以勾选多条记录进行批量操作</li>
                                    <li>点击「下载」可以批量下载已完成的视频</li>
                                    <li>点击「删除」可以批量删除记录</li>
                                    <li>点击「一键删除失败」可以快速删除所有失败的记录</li>
                                    <li>每条记录右上角的删除按钮可以单独删除该记录</li>
                                </ol>
                            </div>

                            <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                                <h3 className="text-xl font-semibold mb-3">资产（资产）</h3>
                                <p className="text-gray-700">
                                    在「资产」页面，您可以查看所有历史生成记录，包括成功、失败和处理中的任务。您可以随时回放视频、下载或删除记录。
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <footer className="p-12 border-t border-gray-200 text-center text-gray-500 text-sm">
                © 2026 ModelHosting. Built for AI Pioneers.
            </footer>
        </div>
    );
}
