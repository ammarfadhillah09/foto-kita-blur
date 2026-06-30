"use client";

import { useState, useEffect } from "react";

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
import { useTheme } from "@/context/ThemeContext";

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

  const { activeTheme } = useTheme();

  // Theme styling helpers
  const getRootClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-[#FFB703] font-pixel text-black';
    if (activeTheme === 'retro') return 'bg-[#EAE0D5] font-retro text-[#3E3228]';
    return 'bg-[#0B1120] font-sans text-white';
  };

  const getContainerClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-white rounded-none border-4 border-black shadow-[6px_6px_0px_0px_#000]';
    if (activeTheme === 'retro') return 'bg-[#EAE0D5] rounded-none border-2 border-[#3E3228] shadow-none';
    return 'bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl';
  };

  const getSidebarClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-white rounded-none border-t-4 md:border-t-0 md:border-r-4 border-black z-50';
    if (activeTheme === 'retro') return 'bg-[#EAE0D5] border-t-2 md:border-t-0 md:border-r-2 border-[#3E3228] z-50';
    return 'bg-slate-900/50 backdrop-blur-md border-t md:border-t-0 md:border-r border-slate-800 z-50';
  };

  const getTextPrimaryClasses = () => {
    if (activeTheme === 'synthwave') return 'text-black';
    if (activeTheme === 'retro') return 'text-[#3E3228]';
    return 'text-white';
  };
  
  const getTextSecondaryClasses = () => {
    if (activeTheme === 'synthwave') return 'text-black/70';
    if (activeTheme === 'retro') return 'text-[#3E3228]/70';
    return 'text-slate-400';
  };

  const getIconContainerClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-[#06D6A0] border-4 border-black text-black rounded-none shadow-[4px_4px_0px_0px_#000]';
    if (activeTheme === 'retro') return 'bg-[#C6AC8F] border border-[#3E3228] text-[#3E3228] rounded-sm';
    return 'bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30';
  };

  const getWarningBannerClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-[#FFB703] border-4 border-black text-black rounded-none shadow-[4px_4px_0px_0px_#000]';
    if (activeTheme === 'retro') return 'bg-[#EAE0D5] border-2 border-[#3E3228] text-[#3E3228] rounded-sm';
    return 'bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl';
  };

  const getButtonPrimaryClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-[#06D6A0] text-black border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none rounded-none';
    if (activeTheme === 'retro') return 'bg-[#C6AC8F] text-[#3E3228] border border-[#3E3228] rounded-sm active:scale-95';
    return 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-lg font-medium transition-all active:scale-95';
  };
  
  const getButtonDangerClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-[#EF476F] text-black border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none rounded-none';
    if (activeTheme === 'retro') return 'bg-[#EAE0D5] text-[#3E3228] border border-[#3E3228] rounded-sm active:scale-95 hover:bg-red-500/10 hover:text-red-900 hover:border-red-900';
    return 'bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all active:scale-95';
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row overflow-hidden relative transition-colors duration-300 ${getRootClasses()}`}>
      {/* Full Window CRT Overlay for Retro Theme */}
      {activeTheme === 'retro' && (
        <div 
          className="fixed inset-0 pointer-events-none z-[100] mix-blend-overlay opacity-30" 
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.4) 1px, rgba(0,0,0,0.4) 2px)' }} 
        />
      )}
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className={`fixed md:relative bottom-0 w-full md:w-64 md:h-screen flex md:flex-col justify-between p-4 md:p-6 pb-safe transition-all duration-300 ${getSidebarClasses()}`}>
        <div className="flex md:flex-col gap-8 md:gap-12 w-full h-full justify-around md:justify-start">
          <div className="hidden md:flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center ${getIconContainerClasses()}`}>
              <Camera className="w-6 h-6" />
            </div>
            <span className={`text-xl font-bold tracking-tight ${getTextPrimaryClasses()}`}>
              Foto Kita Blur
            </span>
          </div>

          <div className="flex flex-row md:flex-col gap-2 w-full justify-around md:justify-start">
            <NavItem
              href="/dashboard"
              icon={<Video />}
              label="Camera"
              active={pathname === "/dashboard"}
              theme={activeTheme}
            />
            <NavItem
              href="/gallery"
              icon={<History />}
              label="Gallery"
              active={pathname === "/gallery"}
              theme={activeTheme}
            />
          </div>
        </div>

        <div className={`hidden md:block mt-auto pt-8 border-t ${activeTheme === 'synthwave' ? 'border-black' : activeTheme === 'retro' ? 'border-[#3E3228]/30' : 'border-white/10'}`}>
          <Link
            href="/"
            className={`flex items-center gap-3 transition-colors w-full px-3 py-2 rounded-lg ${getTextSecondaryClasses()} hover:${getTextPrimaryClasses()} hover:bg-black/5`}
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
            <h1 className={`text-2xl md:text-3xl font-bold mb-1 ${getTextPrimaryClasses()}`}>
              Gallery
            </h1>
            <p className={`text-sm ${getTextSecondaryClasses()}`}>
              Your recorded videos from this session.
            </p>
          </div>

          {/* Warning banner */}
          <div className={`flex items-start gap-3 p-4 mb-8 ${getWarningBannerClasses()}`}>
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm">
              Videos are stored temporarily in your browser&apos;s memory. Reloading or closing this page will <span className="font-bold opacity-100">permanently delete</span> all recordings. Download any videos you wish to keep.
            </p>
          </div>

          {/* Video Grid */}
          {videos.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-32 ${getTextSecondaryClasses()}`}>
              <Film className="w-16 h-16 mb-4 opacity-40" />
              <p className="font-medium text-lg opacity-80">No recordings yet</p>
              <p className="text-sm mt-1 opacity-70">
                Go to the{" "}
                <Link href="/dashboard" className="font-bold hover:underline opacity-100">
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
                  className={`overflow-hidden flex flex-col ${getContainerClasses()}`}
                >
                  <video
                    controls
                    className={`w-full aspect-video ${activeTheme === 'retro' ? 'bg-[#3E3228]/10' : 'bg-black'}`}
                    src={v.blobUrl}
                  />
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${getTextPrimaryClasses()}`}>
                        {v.duration}s Recording
                      </p>
                      <p className={`text-xs mt-0.5 ${getTextSecondaryClasses()}`}>
                        {formatDate(v.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(v.blobUrl, v.createdAt, v.mimeType)}
                        className={`flex items-center gap-2 px-4 py-2 ${getButtonPrimaryClasses()}`}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => removeVideo(v.id)}
                        className={`flex items-center gap-2 px-3 py-2 ${getButtonDangerClasses()}`}
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
  theme = 'dracula',
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  theme?: string;
}) {
  const getActiveClasses = () => {
    if (theme === 'synthwave') return 'bg-white text-black border-4 border-black shadow-[4px_4px_0px_0px_#000] rounded-none';
    if (theme === 'retro') return 'bg-[#3E3228]/10 text-[#3E3228] font-bold border border-[#3E3228] rounded-sm';
    return 'bg-emerald-500/15 text-emerald-400 font-medium rounded-xl';
  };

  const getInactiveClasses = () => {
    if (theme === 'synthwave') return 'text-black/70 hover:text-black hover:bg-black/5 rounded-none';
    if (theme === 'retro') return 'text-[#3E3228]/70 hover:text-[#3E3228] hover:bg-[#3E3228]/5 rounded-sm';
    return 'text-slate-400 hover:text-white hover:bg-white/5 rounded-xl';
  };

  return (
    <Link
      href={href}
      className={`flex md:w-full items-center gap-3 px-3 py-2.5 transition-all ${
        active ? getActiveClasses() : getInactiveClasses()
      }`}
    >
      <div className={`${active && theme === 'dracula' ? "text-emerald-400" : ""}`}>{icon}</div>
      <span className="hidden md:block text-sm">{label}</span>
    </Link>
  );
}
