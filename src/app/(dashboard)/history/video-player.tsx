"use client";

import { useState, useRef, useEffect } from "react";
import { ExternalLink, Maximize2, Minimize2 } from "lucide-react";

interface VideoPlayerProps {
    src: string;
}

export function VideoPlayer({ src }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            try {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } catch (err) {
                console.error("全屏请求失败:", err);
            }
        } else {
            try {
                await document.exitFullscreen();
                setIsFullscreen(false);
            } catch (err) {
                console.error("退出全屏失败:", err);
            }
        }
    };

    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="w-full h-full"
        >
            <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-contain"
                muted
                onMouseOver={(e) => e.currentTarget.play()}
                onMouseOut={(e) => e.currentTarget.pause()}
            />
            <div className="absolute top-2 right-2 flex gap-1">
                <a
                    href={src}
                    target="_blank"
                    className="p-1.5 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition"
                    title="在新窗口查看"
                >
                    <ExternalLink className="h-4 w-4 text-white" />
                </a>
                <button
                    onClick={toggleFullscreen}
                    className="p-1.5 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition"
                    title={isFullscreen ? "退出全屏" : "全屏"}
                >
                    {isFullscreen ? (
                        <Minimize2 className="h-4 w-4 text-white" />
                    ) : (
                        <Maximize2 className="h-4 w-4 text-white" />
                    )}
                </button>
            </div>
        </div>
    );
}
