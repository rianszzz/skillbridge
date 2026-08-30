# Bukti Uji Langsung Tiga Bidang

Pengujian dijalankan pada deployment produksi `https://skillbridge-6ndn.vercel.app` tanggal 28 Agustus 2026 memakai sesi Supabase `test-account-1`.

## Hasil

| Bidang | Bukti yang dikirim | Hasil | Result ID |
| --- | --- | ---: | --- |
| Informatika | `https://github.com/octocat/Hello-World` | Bukti belum cukup | `571d7b3f-85dc-485e-9714-1630aa316fd6` |
| DKV | `fixtures/design/strong.png` dan deskripsi proses fixture | 70/100 | `4715bef9-875c-4ece-9a1e-81b40cdb57d6` |
| Pemasaran | `fixtures/marketing/strong.pdf` | 81/100 | `fdd7cba3-5c32-40a8-9817-e08280ef7847` |

## Screenshot

1. `01-informatika-sebelum-submit.png`: form Informatika sebelum submit.
2. `02-informatika-hasil.png`: hasil live Informatika.
3. `03-dkv-sebelum-submit.png`: form DKV berisi file dan deskripsi sebelum submit.
4. `04-dkv-hasil.png`: hasil live DKV.
5. `05-pemasaran-sebelum-submit.png`: form Pemasaran berisi PDF sebelum submit.
6. `06-pemasaran-hasil.png`: hasil live Pemasaran.
7. `07-riwayat-tiga-pengujian.png`: tiga hasil baru tersimpan berurutan pada riwayat akun sama.

## Rekaman

Rekaman browser 32 frame:

```text
/Users/rian/.config/browser-harness/agent-workspace/recordings/skillbridge-live-three-fields
```

Screenshot dan rekaman membuktikan browser mengisi form, mengirim bukti ke deployment produksi, menerima hasil, dan menyimpan tiga assessment pada riwayat akun. Bukti ini tidak membuktikan akurasi skor terhadap HR manusia; itu membutuhkan baseline penilai manusia independen.
