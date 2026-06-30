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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HandLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import { useGalleryStore } from "@/store/useGalleryStore";

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-950 overflow-hidden relative">
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className={`fixed md:relative bottom-0 w-full md:h-screen glass-panel border-t md:border-t-0 md:border-r border-white/10 z-50 flex md:flex-col justify-between transition-all duration-300 ease-in-out pb-safe ${
        isSidebarOpen 
          ? "md:w-64 translate-y-0 md:translate-x-0 p-4 md:p-6" 
          : "md:w-0 translate-y-0 md:-translate-x-full md:opacity-0 p-4 md:p-0 md:overflow-hidden"
      }`}>
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
      <main className="flex-1 p-4 md:p-8 lg:p-12 mb-20 md:mb-0 relative overflow-hidden transition-all duration-300">
        {/* Background ambient light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none" />

        <div className="max-w-5xl mx-auto h-full flex flex-col items-center justify-center">
          {/* Header */}
          <div className="w-full flex justify-start items-center mb-8 relative z-10 gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                Live Feed
              </h1>
              <p className="text-sm text-gray-400">
                Position your camera and show a peace sign to auto-blur.
              </p>
            </div>
          </div>

          {/* Camera Feed Container */}
          <div className="w-full aspect-[3/4] sm:aspect-[4/3] md:aspect-video bg-gray-900 rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl shadow-black/50 z-10">
            <video ref={videoRef} autoPlay playsInline muted webkit-playsinline="true" hidden className="hidden" />

            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Placeholder shown when camera is off */}
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(#ffffff11 1px, transparent 1px), linear-gradient(90deg, #ffffff11 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                <Camera className="w-16 h-16 mb-4 opacity-50 relative z-10" />
                <p className="font-medium relative z-10">Camera is inactive</p>
              </div>
            )}

            {/* Model loading overlay */}
            {isModelLoading && isCameraActive && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-semibold text-emerald-400 tracking-wide">
                  Initializing AI Model…
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This may take a few seconds on first load
                </p>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/50 backdrop-blur-md text-red-400 text-sm font-bold tracking-widest flex items-center gap-2 z-10 pointer-events-none">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
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
              className="absolute top-4 right-4 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/50 backdrop-blur-md text-emerald-400 text-sm font-bold tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] z-10 pointer-events-none"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,1)]" />
              PEACE DETECTED
            </motion.div>
          </div>

          {/* Controls Row */}
          <div className="w-full mt-8 flex flex-col gap-6 relative z-10 bg-white/5 border border-white/10 p-4 md:p-6 rounded-2xl backdrop-blur-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Start / Stop Camera */}
                <button
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
                    isCameraActive
                      ? "bg-red-500 hover:bg-red-400 text-white shadow-red-500/20"
                      : "bg-emerald-500 hover:bg-emerald-400 text-gray-950 shadow-emerald-500/20"
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
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 ${
                    isRecording
                      ? "bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400"
                      : "bg-white/10 hover:bg-white/20 border border-white/10 text-white"
                  } disabled:opacity-40 disabled:pointer-events-none`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isCameraActive || isModelLoading}
                >
                  {isRecording ? (
                    <Square className="w-4 h-4 fill-current" />
                  ) : (
                    <Circle className="w-5 h-5 fill-red-500 text-red-500" />
                  )}
                  {isRecording ? "Stop Recording" : "Record Video"}
                </button>

                {/* Duration Selector */}
                <div className="flex items-center gap-1 px-1 py-1 rounded-xl bg-black/30 border border-white/5">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDuration(d)}
                      disabled={isRecording}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                        selectedDuration === d
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-gray-400 hover:text-white"
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
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-xs text-gray-400 font-medium hidden sm:inline">Res:</span>
                  <select
                    value={selectedResolution.label}
                    onChange={(e) => {
                      const res = RESOLUTION_OPTIONS.find((r) => r.label === e.target.value);
                      if (res) setSelectedResolution(res);
                    }}
                    disabled={isRecording}
                    className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer disabled:opacity-50"
                  >
                    {RESOLUTION_OPTIONS.map((r) => (
                      <option key={r.label} value={r.label} className="bg-gray-900">
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* FPS Select */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-xs text-gray-400 font-medium hidden sm:inline">FPS:</span>
                  <select
                    value={selectedFps}
                    onChange={(e) => setSelectedFps(Number(e.target.value))}
                    disabled={isRecording}
                    className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer disabled:opacity-50"
                  >
                    {FPS_OPTIONS.map((f) => (
                      <option key={f} value={f} className="bg-gray-900">
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-Blur Toggle Switch */}
                <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Sparkles
                      className={`w-4 h-4 ${autoBlur ? "text-emerald-400" : "text-gray-500"}`}
                    />
                    <span
                      className={`text-sm font-medium ${autoBlur ? "text-white" : "text-gray-400"}`}
                    >
                      Auto-Blur Mode
                    </span>
                  </div>
                  <button
                    onClick={() => setAutoBlur(!autoBlur)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                      autoBlur ? "bg-emerald-500" : "bg-gray-600"
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
            <div className="space-y-2 pt-4 border-t border-white/5">
              <p className="text-xs text-gray-500">
                Select a duration and click <span className="text-gray-300 font-medium">Record</span>. The AI will blur your feed when you show a peace sign. You can stop the recording early at any time.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                <p className="text-xs text-amber-400/90 leading-relaxed font-medium">
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
            className="fixed bottom-24 md:bottom-8 left-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-xl text-emerald-300 text-sm font-medium shadow-lg shadow-emerald-900/20"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            {toast.message}
            <button
              onClick={() => setToast({ message: "", visible: false })}
              className="ml-2 text-emerald-400/60 hover:text-emerald-300 transition-colors"
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
          ? "bg-emerald-500/15 text-emerald-400 font-medium"
          : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <div className={`${active ? "text-emerald-400" : ""}`}>{icon}</div>
      <span className="hidden md:block text-sm">{label}</span>
    </Link>
  );
}
