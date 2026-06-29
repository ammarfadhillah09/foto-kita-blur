import { create } from "zustand";

export interface VideoItem {
  id: string;
  blobUrl: string;
  mimeType: string; // e.g. "video/mp4" or "video/webm"
  duration: number; // selected duration in seconds
  createdAt: number; // Date.now()
}

interface GalleryState {
  videos: VideoItem[];
  addVideo: (video: VideoItem) => void;
  removeVideo: (id: string) => void;
  clearAll: () => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  videos: [],
  addVideo: (video) =>
    set((state) => ({ videos: [video, ...state.videos] })),
  removeVideo: (id) =>
    set((state) => ({
      videos: state.videos.filter((v) => v.id !== id),
    })),
  clearAll: () => set({ videos: [] }),
}));
