"use client";

import { ExternalLink } from "lucide-react";

interface VideoPlayerProps {
    src: string;
}

export function VideoPlayer({ src }: VideoPlayerProps) {
    return (
        <>
            <video
                src={src}
                className="w-full h-full object-contain"
                muted
                onMouseOver={(e) => e.currentTarget.play()}
                onMouseOut={(e) => e.currentTarget.pause()}
            />
            <a
                href={src}
                target="_blank"
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition"
                title="在新窗口查看"
            >
                <ExternalLink className="h-4 w-4 text-white" />
            </a>
        </>
    );
}
