# Inventory API

API latihan untuk membuat, melihat, dan memperbarui stok barang.

## Menjalankan

Memerlukan Node.js 20. Jalankan `npm start`; verifikasi dengan `npm test`.

## Endpoint

- `GET /items`
- `POST /items` dengan `{ "name": "Buku", "price": 25000, "stock": 4 }`
- `PATCH /items/:id/stock` dengan `{ "stock": 7 }`

## Struktur

Domain inventori, validasi, dan HTTP dipisah. Penyimpanan sengaja in-memory untuk prototipe. Autentikasi dan persistence belum tersedia.
