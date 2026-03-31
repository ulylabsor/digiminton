# Digiminton - Walkthrough

## Ringkasan
Aplikasi **Digiminton** adalah Progressive Web App (PWA) mobile-first untuk manajemen badminton yang mencakup 4 fitur utama: pencatatan skor, manajemen member, perhitungan pembayaran, dan laporan.

## Teknologi
- **HTML5 + CSS3 + Vanilla JS** — ringan, tanpa framework berat
- **PWA** — bisa di-install di HP sebagai aplikasi
- **Chart.js** — grafik laporan
- **localStorage** — penyimpanan data lokal

## Fitur yang Dibangun

### 1. 🏠 Dashboard
- Statistik ringkasan sinkron 100% (member, pertandingan, pendapatan riil/lunas, belum lunas).
- **NEW**: **Indikator Live Traffic Simulasi**, menampilkan jumlah pengguna *Online* secara *real-time* dan akumulasi *Total Pengunjung* untuk memberikan kesan aktif dan premium pada aplikasi.
- Pertandingan terakhir & top player (**Terintegrasi dengan informasi jumlah bola yang terpakai**)
- **Tema Malam/Siang** (Dark/Light Mode) yang menyimpan preferensi secara lokal

````carousel
![Dashboard Dark - Halaman utama dark mode](C:\Users\Acer\.gemini\antigravity\brain\94741bfc-54a9-4247-8e7e-d7fd19330206\dashboard_page_1774764334032.png)
<!-- slide -->
![Dashboard Light - Halaman utama light mode dengan toggle tema](C:\Users\Acer\.gemini\antigravity\brain\94741bfc-54a9-4247-8e7e-d7fd19330206\dashboard_light.png)
````

### 2. 🏸 Scoreboard (Skor Pertandingan)
- **Format**: 42×2 Set (Otomatis nyambung ke Set 2 setelah poin 21) dan 21×3 Set (BWF dengan riwayat skor set sebelumnya)
- **Tipe**: Single (1v1) dan Double (2v2)
- **Pemilihan Pemain dengan Fitur *Smart Search***: Anda dapat mengetik nama pemain untuk langsung memfilter secara *real-time* daftar *dropdown*-nya, sangat memudahkan klub dengan data ratusan pemain.
- **Aksi Penambahan Skor**: Langsung "*Tap*" / klik pada layar angka besar (tombol plus telah dihapus agar UI lebih bersih, dan tombol minus dikecilkan).
- **Timer** pertandingan real-time dengan tombol ganda (*play/pause* dan *reset*).
- **Animasi Micro-interactions**: Efek loncatan bertenaga neon *(bouncy pop with neon glow)* setiap kali poin ditambahkan, serta efek denyut jantung *(heartbeat glow)* halus pada indikator babak/Set yang sedang aktif.
- **Service indicator** dengan logo *Shuttlecock* 🏸 animasi halus.
- **Undo** untuk membatalkan aksi
- Otomatis deteksi pemenang set & pertandingan
- **Riwayat Pertandingan** dengan informasi **jumlah shuttlecock yang dipakai**
- Fitur **guest/tamu** player
- **Navigasi Swipe Gestures**: Berpindah antar halaman dengan mengusap (geser) layar ke kanan atau ke kiri.
- **NEW: Mode Fullscreen Tingkat Lanjut**: 
  - Mengubah orientasi ke **landscape otomatis** dengan teks skor raksasa super-terpusat.
  - Otoritas layar mutlak: Fitur gulir (*scroll*) dan usap (*swipe*) **dimatikan otomatis** agar tidak ada perpindahan menu yang tak disengaja.
  - Elemen pengontrol UI pintar: *Timer* dan *Indikator Set* dibuat *floating* mengambang manis di tepian, sedangkan tombol pengurangan skor diminimalkan ke pojok bawah.

````carousel
![Scoreboard Setup - Pengaturan format, tipe, dan pemilihan pemain](C:\Users\Acer\.gemini\antigravity\brain\94741bfc-54a9-4247-8e7e-d7fd19330206\scoreboard_setup_page_1774764470759.png)
<!-- slide -->
![Scoreboard Active - Skor pertandingan aktif dengan timer](C:\Users\Acer\.gemini\antigravity\brain\94741bfc-54a9-4247-8e7e-d7fd19330206\scoreboard_with_scores_1774764504664.png)
<!-- slide -->
![Scoreboard Fullscreen - Tampilan penuh dengan font raksasa untuk HP](C:\Users\Acer\.gemini\antigravity\brain\94741bfc-54a9-4247-8e7e-d7fd19330206\scoreboard_fs.png)
````

### 3. 👥 Member Management
- Tambah, edit, hapus member
- Avatar otomatis dengan warna unik
- Statistik: Win, Loss, Win Rate
- Cari member
- Status aktif/tidak aktif
- Guest player support

````carousel
![Members - Daftar member dengan statistik](C:\Users\Acer\.gemini\antigravity\brain\94741bfc-54a9-4247-8e7e-d7fd19330206\members_list_full_1774764460804.png)
````

### 4. 💰 Pembayaran
- Sistem **berbasis Pemain** (Bukan berbasis pertandingan)
- Kalkulasi: **Total Bola Bekas Pakai di Pertandingan Dia X Harga Bola**
- Diurutkan berdasarkan **jumlah bola yang terpakai** secara berurutan
- Status per pemain: Lunas / Belum Lunas (tap untuk toggle)
- Summary Interaktif: Total tagihan seluruh pemain, total uang yang sudah lunas, dan yang belum lunas.

````carousel
![Pembayaran - Ringkasan dan daftar pembayaran per pemain](C:\Users\Acer\.gemini\antigravity\brain\94741bfc-54a9-4247-8e7e-d7fd19330206\payment_list_new_1774767681740.png)
````

### 5. 📊 Laporan
- Grafik pertandingan dan pendapatan (Line/Bar charts)
- Leaderboard ranking player
- **NEW**: Peringkat "Pertandingan Bola Terbanyak"
- **NEW**: Peringkat "Pemain Bola Terbanyak" (menghitung total bola yang dipakai per individu)
- Riwayat semua pertandingan & filter (Semua, Bulan, Minggu)
- Export ke CSV

````carousel
![Laporan - Grafik dan statistik awal](C:\Users\Acer\.gemini\antigravity\brain\94741bfc-54a9-4247-8e7e-d7fd19330206\reports_page_empty_1774764525362.png)
<!-- slide -->
![Laporan Ranking Shuttlecock - Menampilkan siapa yang paling banyak habisin bola](C:\Users\Acer\.gemini\antigravity\brain\94741bfc-54a9-4247-8e7e-d7fd19330206\reports_new.png)
````

### 6. ⚙️ Pengaturan
- Ubah nama klub
- Ubah harga shuttlecock
- Export/Import data (JSON backup)
- Hapus semua data

## Struktur File

```
digiminton/
├── index.html          # SPA utama
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── css/
│   ├── styles.css      # Design system (dark mode)
│   ├── scoreboard.css  # Scoreboard styles
│   ├── members.css     # Member styles
│   ├── payments.css    # Payment styles
│   └── reports.css     # Report styles
├── js/
│   ├── app.js          # SPA routing & controller
│   ├── store.js        # localStorage CRUD
│   ├── utils.js        # Utility functions
│   ├── scoreboard.js   # Scoreboard + timer
│   ├── members.js      # Member CRUD
│   ├── payments.js     # Payment calculator
│   └── reports.js      # Charts & export
└── assets/
    └── favicon.svg     # App icon
```

## Testing
- ✅ Splash screen animasi
- ✅ Navigasi antar halaman (bottom nav)
- ✅ CRUD member (4 member berhasil ditambahkan)
- ✅ Scoreboard: setup, scoring (5:3), timer, format 42×2
- ✅ Pembayaran: summary cards, pembayaran manual
- ✅ Laporan: grafik, export CSV
- ✅ Responsive mobile view (390×844)
- ✅ Desain dark mode premium

## Deployment & Eksekusi
Aplikasi ini sudah *Production-Ready* dan berjalan sempurna di Vercel:
```bash
# Menjalankan langsung secara lokal di HP/PC
npx serve -l 3000

# Push / Update ke server Vercel (Go-Live)
npx vercel --prod
```

## Demo Recording
![Demo video aplikasi Digiminton](C:\Users\Acer\.gemini\antigravity\brain\94741bfc-54a9-4247-8e7e-d7fd19330206\digiminton_app_test_1774764291968.webp)
