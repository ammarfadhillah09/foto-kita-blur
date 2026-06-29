"use client";

import Link from "next/link";
import {
  Camera,
  History,
  Video,
  ArrowLeft,
  Download,
  Trash2,
  AlertTriangle,
  Film,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useGalleryStore } from "@/store/useGalleryStore";

export default function GalleryPage() {
  const videos = useGalleryStore((s) => s.videos);
  const removeVideo = useGalleryStore((s) => s.removeVideo);
  const pathname = usePathname();

  const handleDownload = (blobUrl: string, createdAt: number, mimeType: string) => {
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `foto-kita-blur-${createdAt}.${ext}`;
    link.click();
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-950">
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className="fixed md:relative bottom-0 w-full md:w-64 md:h-screen glass-panel border-t md:border-t-0 md:border-r border-white/10 z-50 flex md:flex-col justify-between p-4 md:p-6 pb-safe">
        <div className="flex md:flex-col gap-8 md:gap-12 w-full h-full justify-around md:justify-start">
          <div className="hidden md:flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Foto Kita Blur
            </span>
          </div>

          <div className="flex flex-row md:flex-col gap-2 w-full justify-around md:justify-start">
            <NavItem
              href="/dashboard"
              icon={<Video />}
              label="Camera"
              active={pathname === "/dashboard"}
            />
            <NavItem
              href="/gallery"
              icon={<History />}
              label="Gallery"
              active={pathname === "/gallery"}
            />
          </div>
        </div>

        <div className="hidden md:block mt-auto pt-8 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors w-full px-3 py-2 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 mb-20 md:mb-0 relative overflow-hidden">
        {/* Background ambient light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-purple-500/5 blur-[150px] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
              Gallery
            </h1>
            <p className="text-sm text-gray-400">
              Your recorded videos from this session.
            </p>
          </div>

          {/* Warning banner */}
          <div className="flex items-start gap-3 p-4 mb-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400/90">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm">
              Videos are stored temporarily in your browser&apos;s memory. Reloading or closing this page will <span className="font-bold text-amber-300">permanently delete</span> all recordings. Download any videos you wish to keep.
            </p>
          </div>

          {/* Video Grid */}
          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-600">
              <Film className="w-16 h-16 mb-4 opacity-40" />
              <p className="font-medium text-lg text-gray-500">No recordings yet</p>
              <p className="text-sm text-gray-600 mt-1">
                Go to the{" "}
                <Link href="/dashboard" className="text-emerald-400 hover:underline">
                  Camera
                </Link>{" "}
                to start recording.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videos.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="glass-panel rounded-2xl overflow-hidden"
                >
                  <video
                    controls
                    className="w-full aspect-video bg-black"
                    src={v.blobUrl}
                  />
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {v.duration}s Recording
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(v.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(v.blobUrl, v.createdAt, v.mimeType)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm font-medium transition-all active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => removeVideo(v.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-all active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex md:w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
        active
          ? "bg-emerald-500/15 text-emerald-400 font-medium"
          : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <div className={`${active ? "text-emerald-400" : ""}`}>{icon}</div>
      <span className="hidden md:block text-sm">{label}</span>
    </Link>
  );
}
