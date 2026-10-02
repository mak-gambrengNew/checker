# AUDIT & REBUILD — PWA CHECKER

## Status
Rebuild frontend selesai dan diselaraskan dengan backend Supabase aktif.

## Baseline spesifikasi
- Checker adalah petugas perwakilan Owner untuk monitoring, validasi data aktual, kebutuhan mendesak, komunikasi, dan penutupan.
- Identitas Checker berasal dari akun CRUD Checker.
- Monitoring Gerai dan data pembukaan hari berjalan harus terlihat.
- Notifikasi urgent dapat dibuka menjadi detail dan diambil oleh Checker.
- Pengambilan urgent memberi notifikasi lanjutan kepada Owner, Gerai/SPG pengirim, dan Checker lain.
- Pemeriksaan menggunakan data sistem aktual.
- Penutupan Gerai dilakukan melalui pemeriksaan final atomic.
- Penutupan hari mengunci/finalisasi monitoring.
- Pesan antar-role menggunakan kontrak chat yang sama dengan PWA Gerai.

## Temuan audit repo lama
1. Chat Checker belum sepenuhnya setara dengan Gerai.
   - belum chat_mark_read
   - belum deduplikasi pesan di Edge Function
   - belum hook chat-push-worker
   - kontak belum mencakup Checker aktif lain
2. Notifikasi urgent hanya ditampilkan sebagai daftar; belum menjadi alur aksi follow-up.
3. Tap notifikasi belum membuka detail urgent.
4. Belum ada aksi SIAP DITANGANI / MULAI PENANGANAN / SELESAI / BATALKAN di UI.
5. UI lama terlalu berorientasi pada Periksa & Tutup, sementara fungsi Checker lebih luas sebagai petugas monitoring.
6. Service worker cache version tidak dinaikkan saat revisi.

## Perubahan backend
`checker-data` dinaikkan ke v10:
- chat_contacts: Owner + SPG aktif + Checker aktif lain
- chat_send: idempotensi client_message_id
- chat_send: chat_notification_events + chat-push-worker hook
- chat_mark_read
- emergency_detail
- emergency_claim
- emergency_update
- notification_read
- authorization tetap divalidasi terhadap session + profile Checker aktif.

Backend urgent menggunakan workflow:
open -> claimed -> in_progress -> resolved/cancelled.

## Perubahan frontend
- Notifikasi urgent dapat ditap.
- Detail urgent menampilkan Gerai, pengirim, prioritas, status, claimant, catatan.
- Tombol follow-up sesuai status dan hak Checker.
- Chat mendukung Owner/SPG/Checker dan menandai percakapan terbaca.
- Realtime notification tetap digunakan.
- Tidak ada data bisnis/store ID yang di-hardcode.
- Tidak ditemukan dummy/mock/demo/seed/test-gerai pada frontend hasil rebuild.
- Semua data operasional diambil dari Edge Function/server.

## Validasi statis
- JavaScript bundle berhasil lolos `node --check`.
- Frontend menggunakan sessionStorage hanya untuk access token Checker.
- Tidak menggunakan localStorage.
- Tidak ditemukan seed/dummy/mock pada frontend.
- Supabase service-role key tidak ditanam di frontend.

## Catatan penting
Notifikasi urgent sudah dikirim ke `user_notifications` untuk in-app/realtime. Pengiriman Web Push OS/background untuk event urgent masih bergantung pada infrastruktur push-notification khusus yang sudah tersedia di project; alur chat sudah dihubungkan ke `chat-push-worker`.

## File
- index.html — aplikasi Checker
- checker-sw.js — service worker shell cache
- checker-manifest.webmanifest — manifest
- checker_logo.png — logo


## Ketentuan mutlak validasi & penutupan (diterapkan di backend)

1. Saat Checker menekan **Periksa & Tutup Gerai**, server mengambil snapshot data saat itu dan langsung mengunci Gerai untuk mencegah transaksi baru selama pemeriksaan.
2. Gerai tetap berstatus operasional di database, tetapi `checker_locked=true`; PWA Gerai menerima capability operasional sebagai nonaktif selama lock.
3. Setiap selisih uang, penjualan/transaksi, atau logistik wajib memiliki detail/alasan.
4. Nilai fisik Checker menjadi nilai validasi final untuk perhitungan laporan berikutnya. Nilai mentah sistem tetap dipertahankan sebagai bukti audit.
5. Penyesuaian logistik dicatat di `checker_validation_events`, `checker_inspection_items`, dan ledger inventory.
6. Form penutupan yang disubmit adalah sumber final sesi; sesi ditutup atomic dan Gerai tetap terkunci sampai hari berikutnya.
7. `finalize_monitoring_day` hanya dapat berjalan setelah seluruh Gerai selesai ditutup dan pemeriksaan final valid.
8. Monitoring harian memakai nilai final Checker untuk omzet/transaksi/penutupan, bukan kembali ke angka sistem sebelum validasi.
9. Riwayat selisih wajib tersedia untuk Panel Owner dan dapat ditampilkan pada kartu aktivitas Checker.
10. Data mentah transaksi tidak dihapus/diubah; koreksi Checker menjadi override teraudit untuk laporan final.

## Alur wajib

`Gerai aktif → Checker tap Tutup → snapshot + lock → form validasi → selisih + alasan bila ada → submit → sesi closed + data final → Monitoring harian → Semua Gerai Tutup → finalize monitoring → Owner`.


## Backend validation lock — v10

### Kontrak aksi Checker
- `prepare_close_store`: mengambil snapshot server saat tombol Tutup Gerai ditekan dan mengaktifkan `stores.checker_locked`.
- `close_store`: hanya dapat berhasil bila Gerai masih terkunci oleh Checker yang sama; menerima `validation` dan menjadikan hasil Checker sebagai override final.
- `cancel_close_store`: melepas lock bila Checker membatalkan proses sebelum submit final.
- `close_day`: hanya dapat memfinalisasi hari setelah seluruh sesi Gerai selesai ditutup dan pemeriksaan final valid.

### Sumber nilai final
- Kas: `closing_cash` Checker menjadi saldo kas akhir.
- Penjualan: `validation.sales_total` menjadi omzet final laporan bila diberikan; nilai mentah transaksi tetap disimpan sebagai bukti.
- Jumlah transaksi: `validation.transaction_count` menjadi jumlah transaksi final laporan.
- Pembayaran: `validation.payment_summary` menjadi ringkasan pembayaran final bila tersedia.
- Logistik: `checker_inspection_items.physical_quantity` menjadi `closing_quantity` final Monitoring.

### Aturan selisih
Jika nilai Checker berbeda dari snapshot sistem, detail/alasan wajib. Server menolak submit tanpa detail. Setiap selisih dicatat ke `checker_validation_events` dengan nilai sistem, nilai Checker, selisih, Checker, Gerai, sesi, dan waktu.

### Lock transaksi
`monitoring_sales_events` memiliki guard database yang menolak transaksi baru ketika `stores.checker_locked=true`. PWA Gerai juga menerima capability operasional nonaktif dari `get_gerai_context`. Lock harian tetap dipertahankan setelah penutupan dan dapat dibuka kembali oleh proses buka hari berikutnya.

### Integrasi Panel Owner
`owner-data` v6 menyediakan action `checker_activity` yang mengembalikan `validation_events`, `inspections`, dan `emergencies` milik Checker. Data ini menjadi sumber kartu aktivitas/rekam validasi Checker pada Panel Owner.
