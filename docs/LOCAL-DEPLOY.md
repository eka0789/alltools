# Auto-Deploy Lokal Windows (`aktifkoding.biz.id`)

Panduan ini menjelaskan cara mengaktifkan deploy otomatis ke mesin Windows lokal (yang menjalankan Next.js di balik Cloudflare) setiap kali Anda `git commit` dan `git push` ke branch `master`.

## Alur Otomatis

1. Anda melakukan `git commit` dan `git push origin master`.
2. Workflow GitHub Actions **CI** (`.github/workflows/validate-data.yml`) menjalankan `npm run validate` dan `npm test`.
3. Setelah **CI** selesai dengan status sukses pada `push` ke `master`, workflow **Deploy Local (Windows)** (`.github/workflows/deploy-local.yml`) otomatis berjalan di **Windows Self-Hosted Runner** milik Anda.
4. Runner memanggil `scripts/deploy-windows.ps1` yang secara otomatis:
   - Memuat environment dari `.env` dan `.env.local`
   - Menarik commit terbaru (`git pull --ff-only origin master`) jika working tree bersih
   - Menjalankan `npm ci` hanya bila `package-lock.json` berubah (atau `node_modules` belum ada)
   - Memperbarui snapshot katalog `src/data/catalog.generated.json` tanpa menghapus data database lokal/remote
   - Membackup folder `.next` lama ke `.next.bak`
   - Menjalankan `npx next build`
   - Menjalankan ulang aplikasi lewat **PM2** (`ecosystem.config.cjs`)
   - Mengecek health check lokal (`http://127.0.0.1:<port>/` harus HTTP `200`)
   - Jika build atau startup gagal, otomatis **rollback** ke `.next.bak` dan menyalakan ulang build sebelumnya.

---

## Setup Sekali Saja (5 Langkah)

### 1. Install PM2 & hentikan server manual lama
Jalankan di PowerShell pada mesin server Windows:

```powershell
npm install -g pm2
```

Jika sebelumnya Anda menjalankan server secara manual (misalnya lewat `npm run start` di terminal), hentikan dulu proses lama tersebut agar port aplikasi (`3000`) tidak bentrok saat PM2 mulai berjalan.

### 2. Pastikan `.env.local` sudah lengkap
Pastikan file `.env.local` di folder deploy sudah berisi seluruh variabel produksi yang dibutuhkan, khususnya:

```env
NEXT_PUBLIC_SITE_URL=https://aktifkoding.biz.id
PORT=3000
```

Tambahkan juga env produksi lain yang Anda pakai (`ADMIN_TOKEN`, `ALLTOOLS_DB_URL`, `ALLTOOLS_DB_AUTH_TOKEN`, `RESEND_API_KEY`, `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`, dll).

### 3. Deploy perdana manual lewat PM2
Jalankan perintah berikut sekali di folder deploy untuk langsung menerbitkan versi terbaru ke PM2:

```powershell
npm run deploy:local
```

> **Opsional (auto-start saat Windows restart):** PM2 tidak otomatis menyalakan service bawaan Windows seperti di Linux. Anda bisa menjadwalkan perintah `pm2 resurrect` saat startup lewat **Task Scheduler** Windows (jalankan pada *At startup* setelah sebelumnya menjalankan `pm2 save`).

### 4. Pasang GitHub Actions Self-Hosted Runner di Windows
1. Buka repository di GitHub: **Settings → Actions → Runners → New self-hosted runner**.
2. Pilih **Windows** dan arsitektur **x64**.
3. Buat folder terpisah di luar folder aplikasi, misalnya `C:\actions-runner`, lalu ikuti perintah download & ekstrak dari halaman GitHub tersebut.
4. Saat menjalankan `.\config.cmd`, ikuti prompt:
   - Runner group & name: tekan Enter (default) atau beri nama (mis. `aktifkoding-win`).
   - Labels: biarkan default (`self-hosted,Windows,X64`) — workflow menargetkan `[self-hosted, windows]`.
   - **Would you like to run the runner service as a service?**: jawab **`Y`** agar runner otomatis berjalan di background meskipun Anda menutup terminal atau reboot Windows.

### 5. Atur Repository Variables di GitHub
Buka repository di GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Nama Variabel | Wajib? | Contoh Nilai | Keterangan |
| --- | --- | --- | --- |
| `LOCAL_DEPLOY_DIR` | **Wajib** | `C:\deploy\alltools` *(atau `C:\Users\EkaDev\alltools`)* | Path absolut folder repo yang di-serve PM2 di mesin Windows. |
| `PM2_APP_NAME` | Opsional | `aktifkoding` | Nama proses di PM2 (default: `aktifkoding`). |
| `APP_PORT` | Opsional | `3000` | Port server Next.js (default: baca `PORT` dari `.env.local`, lalu `3000`). |
| `NODE_DIR` | Opsional | `C:\Program Files\nodejs` | Isi hanya jika Windows Service tidak menemukan `node` atau `pm2` di `PATH`. |

---

## Catatan Penting & Keamanan

- **Pisahkan folder coding vs folder produksi (direkomendasikan):** `deploy-windows.ps1` akan membatalkan deploy secara aman jika ada perubahan file tracked yang belum di-commit. Jika Anda sering mengedit kode di PC yang sama dengan server, clone salinan bersih khusus produksi (misalnya `C:\deploy\alltools`), salin `.env.local` & `data/alltools.db` ke sana, jalankan `npm run deploy:local` sekali, lalu arahkan `LOCAL_DEPLOY_DIR` ke `C:\deploy\alltools`.
- **Hanya berjalan pada `push` ke `master`:** Pull Request tidak memicu deploy lokal.
- **Trigger manual kapan saja:** Buka tab **Actions → Deploy Local (Windows) → Run workflow** jika ingin memaksa rebuild (`force_install`) atau restart ulang (`skip_pull`).

---

## Monitoring & Troubleshooting

```powershell
# Cek status aplikasi PM2
pm2 status

# Lihat log live atau 50 baris terakhir
pm2 logs aktifkoding --lines 50

# Restart manual jika perlu
pm2 restart aktifkoding
```

- **Jika job gagal dengan pesan `node` atau `pm2` tidak ditemukan:** Pastikan PM2 terpasang global dan tambahkan folder lokasi `node.exe` serta `pm2.cmd` (biasanya `C:\Users\<User>\AppData\Roaming\npm` dan `C:\Program Files\nodejs`) ke variabel GitHub `NODE_DIR`, atau jalankan ulang service runner memakai akun user Windows Anda.
- **Jika domain masih menampilkan konten lama padahal health check `127.0.0.1:3000` sudah sukses:** Cek aturan cache Cloudflare (*Purge Cache* jika ada rule Cache Everything) serta refresh browser (`Ctrl+Shift+R`) untuk memperbarui Service Worker (`public/sw.js`).
