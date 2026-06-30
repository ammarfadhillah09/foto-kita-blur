"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  History,
  ArrowLeft,
  Video,
  VideoOff,
  Circle,
  Square,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Timer,
  Menu,
  Palette,
  Tv,
  Gamepad2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HandLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import { useGalleryStore } from "@/store/useGalleryStore";
import { useTheme, DAISY_THEMES, DaisyTheme } from "@/context/ThemeContext";

// MediaPipe hand landmark indices
const INDEX_TIP = 8;
const INDEX_MCP = 5;
const MIDDLE_TIP = 12;
const MIDDLE_MCP = 9;
const RING_TIP = 16;
const RING_PIP = 14;
const PINKY_TIP = 20;
const PINKY_PIP = 18;

const DURATION_OPTIONS = [15, 30, 45] as const;
type DurationOption = (typeof DURATION_OPTIONS)[number];

const RESOLUTION_OPTIONS = [
  { label: "360p", width: 640, height: 360 },
  { label: "480p", width: 854, height: 480 },
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
];
const FPS_OPTIONS = [15, 30, 60];


export default function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedResolution, setSelectedResolution] = useState(RESOLUTION_OPTIONS[2]);
  const [selectedFps, setSelectedFps] = useState(30);
  const { activeTheme, setActiveTheme } = useTheme();

  const [autoBlur, setAutoBlur] = useState(true);
  const [isPeaceDetected, setIsPeaceDetected] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(15);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(0);

  // Toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const lastTimestampRef = useRef<number>(-1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const autoBlurRef = useRef(true);
  const isPeaceDetectedRef = useRef(false);

  useEffect(() => {
    autoBlurRef.current = autoBlur;
  }, [autoBlur]);

  const addVideo = useGalleryStore((s) => s.addVideo);
  const pathname = usePathname();

  // ---------- Show toast helper ----------
  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 4000);
  }, []);

  // ---------- Initialise HandLandmarker once on mount ----------
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      if (cancelled) return;

      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });

      if (cancelled) {
        landmarker.close();
        return;
      }

      handLandmarkerRef.current = landmarker;
      setIsModelLoading(false);
    }

    init();

    return () => {
      cancelled = true;
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
    };
  }, []);

  // ---------- Peace-sign detector ----------
  const checkPeaceSign = useCallback(
    (landmarks: { x: number; y: number; z: number }[]): boolean => {
      const indexExtended = landmarks[INDEX_TIP].y < landmarks[INDEX_MCP].y;
      const middleExtended = landmarks[MIDDLE_TIP].y < landmarks[MIDDLE_MCP].y;
      const ringFolded = landmarks[RING_TIP].y > landmarks[RING_PIP].y;
      const pinkyFolded = landmarks[PINKY_TIP].y > landmarks[PINKY_PIP].y;
      return indexExtended && middleExtended && ringFolded && pinkyFolded;
    },
    []
  );

  // ---------- rAF prediction loop ----------
  const predict = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = handLandmarkerRef.current;

    if (!video || !canvas || !landmarker || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(predict);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(predict);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.save();
    // 1. Mirror the context horizontally
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // 2. Apply blur natively to the pixels if peace sign is detected
    if (isPeaceDetectedRef.current && autoBlurRef.current) {
        ctx.filter = 'blur(12px)';
    } else {
        ctx.filter = 'none';
    }

    // 3. Draw the video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 4. Reset filter immediately (Fixes Safari lingering filter bugs)
    ctx.filter = 'none';
    ctx.restore();

    // Run detection
    const now = performance.now();
    if (now !== lastTimestampRef.current) {
      lastTimestampRef.current = now;
      const results = landmarker.detectForVideo(video, now);
      let detected = false;
      if (results.landmarks && results.landmarks.length > 0) {
        for (const hand of results.landmarks) {
          if (checkPeaceSign(hand)) {
            detected = true;
            break;
          }
        }
      }
      setIsPeaceDetected(detected);
      isPeaceDetectedRef.current = detected;
    }

    animationFrameRef.current = requestAnimationFrame(predict);
  }, [checkPeaceSign]);

  // ---------- Start / Stop camera ----------
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", 
          width: { ideal: selectedResolution.width }, 
          height: { ideal: selectedResolution.height },
          frameRate: { ideal: selectedFps }
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      animationFrameRef.current = requestAnimationFrame(predict);
    } catch (err) {
      console.error("Camera access denied:", err);
    } finally {
      setIsLoading(false);
    }
  }, [predict, selectedResolution, selectedFps]);

  useEffect(() => {
    if (isCameraActive && !isRecording) {
      startCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResolution, selectedFps]);

  const stopCamera = useCallback(() => {
    // Stop any active recording first
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    cancelAnimationFrame(animationFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setIsPeaceDetected(false);
    setIsRecording(false);
    setRecordingTimeLeft(0);
    lastTimestampRef.current = -1;
  }, []);

  // ---------- Video recording ----------
  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture the canvas stream (includes mirror + blur effects)
    const canvasStream = canvas.captureStream(30);
    chunksRef.current = [];

    // Prefer MP4, then VP9 WebM, then plain WebM
    let options: MediaRecorderOptions = { mimeType: "video/webm" };
    if (MediaRecorder.isTypeSupported("video/mp4")) {
      options = { mimeType: "video/mp4" };
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      options = { mimeType: "video/webm;codecs=vp9" };
    }

    const recorder = new MediaRecorder(canvasStream, options);
    const chosenMime = options.mimeType ?? "video/webm";

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: chosenMime });
      const blobUrl = URL.createObjectURL(blob);

      addVideo({
        id: crypto.randomUUID(),
        blobUrl,
        mimeType: chosenMime,
        duration: selectedDuration,
        createdAt: Date.now(),
      });

      setIsRecording(false);
      setRecordingTimeLeft(0);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      showToast("Recording saved! Check the Gallery to view it.");
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTimeLeft(selectedDuration);

    // Countdown timer
    const startTime = Date.now();
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = selectedDuration - elapsed;
      if (remaining <= 0) {
        setRecordingTimeLeft(0);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      } else {
        setRecordingTimeLeft(remaining);
      }
    }, 500);

    // Auto-stop
    recordingTimerRef.current = setTimeout(() => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }, selectedDuration * 1000);
  }, [selectedDuration, addVideo, showToast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // ---------- Cleanup on unmount ----------
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const shouldBlur = isPeaceDetected && autoBlur;

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

  const getButtonPrimaryClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-[#06D6A0] text-black border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none rounded-none';
    if (activeTheme === 'retro') return 'bg-[#C6AC8F] text-[#3E3228] border border-[#3E3228] rounded-sm active:scale-95';
    return 'bg-emerald-500 hover:bg-emerald-400 text-white rounded-full font-semibold transition-all active:scale-95';
  };
  
  const getButtonDangerClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-[#EF476F] text-black border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none rounded-none';
    if (activeTheme === 'retro') return 'bg-[#C6AC8F] text-[#3E3228] border border-[#3E3228] rounded-sm active:scale-95';
    return 'bg-rose-500 hover:bg-rose-400 text-white rounded-full font-semibold transition-all active:scale-95';
  };

  const getButtonSecondaryClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-white text-black border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none rounded-none';
    if (activeTheme === 'retro') return 'bg-transparent text-[#3E3228] border border-[#3E3228] rounded-sm hover:bg-[#3E3228]/5 active:scale-95';
    return 'bg-slate-800 text-white border border-slate-700 rounded-xl hover:bg-slate-700 active:scale-95';
  };

  const getSelectWrapperClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-white border-4 border-black rounded-none text-black';
    if (activeTheme === 'retro') return 'bg-[#C6AC8F] border border-[#3E3228] rounded-sm text-[#3E3228]';
    return 'bg-slate-800 border border-slate-700 rounded-xl text-white';
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

  const getBadgeDangerClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-[#EF476F] border-4 border-black text-black rounded-none shadow-[4px_4px_0px_0px_#000]';
    if (activeTheme === 'retro') return 'bg-[#EAE0D5] border-2 border-[#3E3228] text-[#3E3228] rounded-sm';
    return 'bg-rose-500/20 border border-rose-500/50 text-rose-400 rounded-full';
  };

  const getBadgeSuccessClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-[#06D6A0] border-4 border-black text-black rounded-none shadow-[4px_4px_0px_0px_#000]';
    if (activeTheme === 'retro') return 'bg-[#EAE0D5] border-2 border-[#3E3228] text-[#3E3228] rounded-sm';
    return 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)]';
  };
  
  const getWarningBannerClasses = () => {
    if (activeTheme === 'synthwave') return 'bg-[#FFB703] border-4 border-black text-black rounded-none shadow-[4px_4px_0px_0px_#000]';
    if (activeTheme === 'retro') return 'bg-[#EAE0D5] border-2 border-[#3E3228] text-[#3E3228] rounded-sm';
    return 'bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl';
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
      <nav className={`fixed md:relative bottom-0 w-full md:h-screen flex md:flex-col justify-between transition-all duration-300 ease-in-out pb-safe ${getSidebarClasses()} ${
        isSidebarOpen 
          ? "md:w-64 translate-y-0 md:translate-x-0 p-4 md:p-6" 
          : "md:w-0 translate-y-0 md:-translate-x-full md:opacity-0 p-4 md:p-0 md:overflow-hidden"
      }`}>
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
            />
            <NavItem
              href="/gallery"
              icon={<History />}
              label="Gallery"
              active={pathname === "/gallery"}
            />
          </div>
        </div>

        <div className="hidden md:block mt-auto pt-8 border-t border-base-content/10">
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
      <main className="flex-1 p-4 md:p-8 lg:p-12 mb-20 md:mb-0 relative overflow-hidden transition-all duration-300">
        {/* Background ambient light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

        <div className="max-w-5xl mx-auto h-full flex flex-col items-center justify-center">
          {/* Header */}
          <div className="w-full flex justify-start items-center mb-8 relative z-10 gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`hidden md:flex p-2 rounded-xl border transition-colors ${getButtonSecondaryClasses()}`}
              title="Toggle Sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold mb-1 ${getTextPrimaryClasses()}`}>
                Live Feed
              </h1>
              <p className={`text-sm ${getTextSecondaryClasses()}`}>
                Position your camera and show a peace sign to auto-blur.
              </p>
            </div>
          </div>

          {/* Camera Feed Container */}
          <div className={`w-full aspect-[3/4] sm:aspect-[4/3] md:aspect-video relative overflow-hidden z-10 transition-all duration-300 ${getContainerClasses()}`}>
            <video ref={videoRef} autoPlay playsInline muted webkit-playsinline="true" hidden className="hidden" />

            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Placeholder shown when camera is off */}
            {!isCameraActive && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center ${getTextSecondaryClasses()}`}>
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                <Camera className="w-16 h-16 mb-4 opacity-50 relative z-10" />
                <p className="font-medium relative z-10">Camera is inactive</p>
              </div>
            )}

            {/* Conditional Decorative Elements */}
            {activeTheme === 'retro' && (
              <div className="absolute bottom-4 left-4 z-20 p-2 bg-[#EAE0D5] rounded-sm border border-[#3E3228] text-[#3E3228] pointer-events-none">
                <Tv className="w-5 h-5" />
              </div>
            )}

            {activeTheme === 'synthwave' && (
              <>
                <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_0_4px_#000] opacity-80 m-1.5" />
                <div className="absolute bottom-4 left-4 z-20 p-2 bg-white border-4 border-black text-black shadow-[4px_4px_0px_0px_#000] pointer-events-none">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                {/* 4 decorative pixel corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-[6px] border-l-[6px] border-black pointer-events-none z-20" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-[6px] border-r-[6px] border-black pointer-events-none z-20" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[6px] border-l-[6px] border-black pointer-events-none z-20" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[6px] border-r-[6px] border-black pointer-events-none z-20" />
              </>
            )}

            {/* Model loading overlay */}
            {isModelLoading && isCameraActive && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-semibold text-white tracking-wide">
                  Initializing AI Model…
                </p>
                <p className="text-xs text-white/70 mt-1">
                  This may take a few seconds on first load
                </p>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className={`absolute top-4 left-4 px-4 py-2 backdrop-blur-md text-sm font-bold tracking-widest flex items-center gap-2 z-10 pointer-events-none ${getBadgeDangerClasses()}`}>
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${activeTheme === 'synthwave' || activeTheme === 'retro' ? 'bg-current' : 'bg-error'}`} />
                REC {recordingTimeLeft}s
              </div>
            )}

            {/* Glowing Green Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: isPeaceDetected ? 1 : 0,
                scale: isPeaceDetected ? 1 : 0.8,
              }}
              className={`absolute top-4 right-4 px-4 py-2 backdrop-blur-md text-sm font-bold tracking-widest flex items-center gap-2 z-10 pointer-events-none ${getBadgeSuccessClasses()}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${activeTheme === 'synthwave' || activeTheme === 'retro' ? 'bg-current' : 'bg-success shadow-[0_0_10px_rgba(52,211,153,1)]'}`} />
              PEACE DETECTED
            </motion.div>
          </div>

          {/* Controls Row */}
          <div className={`w-full mt-8 flex flex-col gap-6 relative z-10 p-4 md:p-6 transition-all duration-300 ${getContainerClasses()}`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Start / Stop Camera */}
                <button
                  className={`flex items-center gap-2 px-6 py-3 font-bold transition-all ${
                    isCameraActive
                      ? getButtonDangerClasses()
                      : getButtonPrimaryClasses()
                  }`}
                  onClick={isCameraActive ? stopCamera : startCamera}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isCameraActive ? (
                    <VideoOff className="w-5 h-5" />
                  ) : (
                    <Video className="w-5 h-5" />
                  )}
                  {isLoading
                    ? "Starting…"
                    : isCameraActive
                      ? "Stop Camera"
                      : "Start Camera"}
                </button>

                {/* Record / Stop Recording */}
                <button
                  className={`flex items-center gap-2 px-6 py-3 font-bold transition-all disabled:opacity-40 disabled:pointer-events-none ${
                    isRecording
                      ? getButtonDangerClasses()
                      : getButtonSecondaryClasses()
                  }`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isCameraActive || isModelLoading}
                >
                  {isRecording ? (
                    <Square className="w-4 h-4 fill-current" />
                  ) : (
                    <Circle className="w-5 h-5 fill-error text-error" />
                  )}
                  {isRecording ? "Stop Recording" : "Record Video"}
                </button>

                {/* Duration Selector */}
                <div className={`flex items-center gap-1 px-1 py-1 ${getSelectWrapperClasses()}`}>
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDuration(d)}
                      disabled={isRecording}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                        selectedDuration === d
                          ? activeTheme === 'synthwave' ? 'bg-black text-white' : activeTheme === 'retro' ? 'bg-[#3E3228] text-[#EAE0D5]' : 'bg-primary/20 text-primary border border-primary/30'
                          : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Timer className="w-3 h-3" />
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-center md:justify-end">
                {/* Resolution Select */}
                <div className={`flex items-center gap-2 px-3 py-2 ${getSelectWrapperClasses()}`}>
                  <span className="text-xs font-medium hidden sm:inline opacity-70">Res:</span>
                  <select
                    value={selectedResolution.label}
                    onChange={(e) => {
                      const res = RESOLUTION_OPTIONS.find((r) => r.label === e.target.value);
                      if (res) setSelectedResolution(res);
                    }}
                    disabled={isRecording}
                    className="bg-transparent text-sm font-medium outline-none cursor-pointer disabled:opacity-50"
                  >
                    {RESOLUTION_OPTIONS.map((r) => (
                      <option key={r.label} value={r.label} className="bg-white text-black">
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* FPS Select */}
                <div className={`flex items-center gap-2 px-3 py-2 ${getSelectWrapperClasses()}`}>
                  <span className="text-xs font-medium hidden sm:inline opacity-70">FPS:</span>
                  <select
                    value={selectedFps}
                    onChange={(e) => setSelectedFps(Number(e.target.value))}
                    disabled={isRecording}
                    className="bg-transparent text-sm font-medium outline-none cursor-pointer disabled:opacity-50"
                  >
                    {FPS_OPTIONS.map((f) => (
                      <option key={f} value={f} className="bg-white text-black">
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Theme Select */}
                <div className={`flex items-center gap-2 px-3 py-2 ${getSelectWrapperClasses()}`}>
                  <Palette className="w-4 h-4 opacity-70" />
                  <select
                    value={activeTheme}
                    onChange={(e) => setActiveTheme(e.target.value as DaisyTheme)}
                    className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                  >
                    {DAISY_THEMES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-white text-black">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-Blur Toggle Switch */}
                <div className={`flex items-center gap-4 px-4 py-2 ${getSelectWrapperClasses()}`}>
                  <div className="flex items-center gap-2">
                    <Sparkles
                      className={`w-4 h-4 ${autoBlur ? "opacity-100" : "opacity-40"}`}
                    />
                    <span
                      className={`text-sm font-medium ${autoBlur ? "opacity-100" : "opacity-60"}`}
                    >
                      Auto-Blur Mode
                    </span>
                  </div>
                  <button
                    onClick={() => setAutoBlur(!autoBlur)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                      autoBlur 
                        ? activeTheme === 'synthwave' ? 'bg-black' : activeTheme === 'retro' ? 'bg-[#3E3228]' : 'bg-emerald-500'
                        : "bg-black/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                        autoBlur ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Explanatory text */}
            <div className={`space-y-2 pt-4 border-t ${activeTheme === 'synthwave' ? 'border-black/10' : activeTheme === 'retro' ? 'border-[#3E3228]/10' : 'border-slate-700/50'}`}>
              <p className={`text-xs ${getTextSecondaryClasses()}`}>
                Select a duration and click <span className="font-medium opacity-100">Record</span>. The AI will blur your feed when you show a peace sign. You can stop the recording early at any time.
              </p>
              <div className={`p-3 ${getWarningBannerClasses()}`}>
                <p className="text-xs leading-relaxed font-medium">
                  ⚠️ Videos are saved temporarily in your browser&apos;s memory and will be permanently deleted upon reloading. Performance Tip: All AI processing runs locally. If you experience lag, please lower the Resolution and FPS settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast notification */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-24 md:bottom-8 left-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl bg-success/20 border border-success/40 backdrop-blur-xl text-success text-sm font-medium shadow-lg shadow-success/20"
          >
            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
            {toast.message}
            <button
              onClick={() => setToast({ message: "", visible: false })}
              className="ml-2 text-success/60 hover:text-success transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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
          ? "bg-primary/15 text-primary font-medium"
          : "text-base-content/60 hover:text-base-content hover:bg-base-content/5"
      }`}
    >
      <div className={`${active ? "text-primary" : ""}`}>{icon}</div>
      <span className="hidden md:block text-sm">{label}</span>
    </Link>
  );
}
