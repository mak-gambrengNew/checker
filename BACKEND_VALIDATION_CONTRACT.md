# KONTRAK BACKEND VALIDASI CHECKER

## Prinsip mutlak
Checker bukan hanya mencatat hasil pemeriksaan. Nilai yang ditemukan dan disubmit Checker menjadi nilai validasi yang dipakai laporan final. Data mentah sistem tetap disimpan sebagai bukti audit.

## Alur penutupan
1. Checker menekan `Periksa & Tutup Gerai`.
2. Client memanggil `checker-data` action `prepare_close_store`.
3. Server mengambil snapshot dan mengunci Gerai.
4. Form menampilkan snapshot.
5. Checker mengisi nilai fisik/validasi.
6. Bila berbeda, alasan/detail wajib.
7. Client memanggil `close_store` dengan `validation`.
8. Server menulis audit, menyesuaikan data operasional yang relevan, menutup sesi secara atomic, dan mempertahankan lock.
9. `finalize_monitoring_day` membangun laporan harian dari nilai final Checker.
10. `close_day` mengunci laporan harian dan meneruskannya ke sumber data Owner.

## Endpoint payload

### prepare_close_store
```json
{
  "action": "prepare_close_store",
  "store_id": "...",
  "operation_session_id": "..."
}
```

### close_store
```json
{
  "action": "close_store",
  "store_id": "...",
  "operation_session_id": "...",
  "closing_cash": 22000,
  "overall_result": "selisih",
  "note": "...",
  "items": [],
  "validation": {
    "sales_total": 100000,
    "transaction_count": 12,
    "cash_detail": "...",
    "sales_detail": "...",
    "transaction_detail": "...",
    "payment_summary": [
      {"method":"Tunai","amount":70000},
      {"method":"QRIS","amount":30000}
    ],
    "details": []
  }
}
```

## Audit
Table `checker_validation_events` menyimpan setiap selisih final dengan `system_value`, `checker_value`, `difference`, `detail`, `checker_id`, `store_id`, dan `operation_session_id`.

## Owner
Gunakan `owner-data` action `checker_activity` untuk mengambil riwayat validasi Checker.
