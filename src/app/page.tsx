"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, Shield, Zap, Lock } from "lucide-react";

const GithubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
    <path d="M9 18c-4.51 2-5-2-7-2"></path>
  </svg>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Foto Kita Blur</span>
          </div>

        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-8 text-center lg:text-left z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight"
            >
              Foto Kita Blur
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-gray-400 max-w-2xl mx-auto lg:mx-0"
            >
              Protect your privacy instantly. Show a peace sign to the camera and our AI will automatically blur the background or specific elements in real-time.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-500 px-8 text-sm font-medium text-gray-950 shadow-lg hover:bg-emerald-400 transition-colors gap-2"
              >
                Try Now <Zap className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex-1 w-full max-w-xl lg:max-w-none relative z-10"
          >
            <div className="aspect-video rounded-2xl glass-panel p-2 overflow-hidden shadow-2xl shadow-emerald-900/20">
              <div className="w-full h-full rounded-xl bg-gray-900 border border-white/5 relative flex items-center justify-center overflow-hidden">
                {/* Mock Video Content */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511556820780-d912e42b4980?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-40 blur-sm" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 flex items-center justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 backdrop-blur-md flex items-center justify-center">
                      <Camera className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-md text-emerald-400 text-xs font-bold tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    PEACE DETECTED
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="w-full max-w-7xl mx-auto px-6 py-20 border-t border-white/10 z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-6 h-6 text-emerald-400" />,
                title: "Real-time Detection",
                desc: "Lightning-fast AI detects your hand gestures instantly without noticeable lag.",
              },
              {
                icon: <Shield className="w-6 h-6 text-blue-400" />,
                title: "Privacy First",
                desc: "All processing happens securely. Your video feed never leaves your device.",
              },
              {
                icon: <Lock className="w-6 h-6 text-purple-400" />,
                title: "Smart Blurring",
                desc: "Accurately segments you from the background to ensure only what's needed is blurred.",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-panel p-8 rounded-2xl glass-panel-hover transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 py-6">
        <div className="text-sm text-gray-500 flex items-center justify-center gap-1.5">
          Developed by{" "}
          <a
            href="https://github.com/ammarfadhillah09"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-white transition-colors duration-200 group"
          >
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
              ammaw
            </span>
            <GithubIcon className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors duration-200" />
          </a>
        </div>
      </footer>
    </div>
  );
}
