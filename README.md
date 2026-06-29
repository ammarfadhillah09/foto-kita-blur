# Foto Kita Blur ✌️

Aplikasi web interaktif berbasis Artificial Intelligence (AI) yang secara otomatis akan memberikan efek sensor/blur pada video kamera Anda ketika mendeteksi gestur tangan "Peace" (✌️). 

Dibuat sepenuhnya berjalan di sisi klien (*client-side*) untuk menjamin privasi pengguna tanpa perlu menyimpan data di server.

## ✨ Fitur Utama

- **Deteksi Gestur Real-time:** Menggunakan model AI MediaPipe untuk mendeteksi jari telunjuk dan jari tengah secara akurat.
- **Auto-Blur Filter:** Efek blur diaplikasikan langsung secara *native* ke dalam piksel video.
- **Perekam Video (Video Recorder):** Rekam momen Anda dengan durasi pilihan (15 detik, 30 detik, atau 45 detik).
- **Galeri Sementara (Privacy First):** Video hasil rekaman disimpan sementara di memori *browser*. Jika halaman di- *reload*, semua video otomatis terhapus.
- **Unduh Format MP4:** Simpan hasil rekaman video (lengkap dengan efek blurnya) langsung ke perangkat Anda.

## 🛠️ Teknologi yang Digunakan

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **AI / Computer Vision:** [@mediapipe/tasks-vision](https://developers.google.com/mediapipe) (Google)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Analytics:** [Vercel Web Analytics](https://vercel.com/analytics)

## 🚀 Cara Menjalankan di Komputer Lokal

1. Clone repository ini:
   ```bash
   git clone [https://github.com/ammarfadhillah09/foto-kita-blur.git](https://github.com/ammarfadhillah09/foto-kita-blur.git)
