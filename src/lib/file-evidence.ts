import { getDocument } from "unpdf/pdfjs";

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = MAX_FILE_BYTES + 64 * 1024;
const MAX_IMAGE_PIXELS = 24_000_000;
const MAX_PDF_CHARACTERS = 30_000;

export function detectFileType(bytes: Uint8Array) {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf" as const;
  if (bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])) return "png" as const;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg" as const;
  throw new Error("Format bukti tidak didukung. Gunakan PDF, PNG, atau JPEG sesuai bidang.");
}

export function validateFile(bytes: Uint8Array, field: "design" | "marketing") {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error("Ukuran bukti harus lebih dari 0 dan maksimal 4 MB.");
  const type = detectFileType(bytes);
  if (field === "design" && type === "pdf") throw new Error("DKV prototipe menerima PNG atau JPEG agar karya dapat dinilai secara visual.");
  if (field === "marketing" && type !== "pdf") throw new Error("Bisnis/Pemasaran prototipe menerima PDF laporan dengan text layer.");
  if (type === "png" || type === "jpeg") validateImageDimensions(bytes, type);
  return type;
}

export async function extractPdfText(bytes: Uint8Array) {
  const document = await Promise.race([
    getDocument({ data: bytes }).promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Pemrosesan PDF melewati batas waktu.")), 12_000)),
  ]);
  if (document.numPages > 15) throw new Error("Laporan PDF maksimal 15 halaman.");
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    if (content.items.length > 20_000) throw new Error("Halaman PDF terlalu kompleks untuk diproses.");
    const text = content.items.map((item) => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " ").trim();
    const blocks = splitTextBlocks(text);
    pages.push(blocks.map((block, index) => `[PAGE:${pageNumber}:BLOCK:${index + 1}]\n${block}`).join("\n\n"));
    if (pages.join("\n\n").length >= MAX_PDF_CHARACTERS) break;
  }
  const text = pages.join("\n\n").slice(0, MAX_PDF_CHARACTERS);
  if (text.replace(/\[PAGE:\d+:BLOCK:\d+\]/g, "").trim().length < 100) throw new Error("Teks laporan tidak ditemukan. Gunakan PDF dengan text layer, bukan hasil scan.");
  return { text, pages: pages.length };
}

export function splitTextBlocks(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean).flatMap((sentence) => sentence.length <= 600 ? [sentence] : sentence.match(/.{1,600}(?:\s|$)/g)?.map((part) => part.trim()).filter(Boolean) ?? [sentence.slice(0, 600)]) ?? [];
  const blocks: string[] = [];
  for (const sentence of sentences) {
    if (!blocks.length || `${blocks.at(-1)} ${sentence}`.length > 600) blocks.push(sentence);
    else blocks[blocks.length - 1] += ` ${sentence}`;
  }
  return blocks.length ? blocks : [text];
}

function validateImageDimensions(bytes: Uint8Array, type: "png" | "jpeg") {
  const dimensions = type === "png" ? { width: readUint32(bytes, 16), height: readUint32(bytes, 20) } : jpegDimensions(bytes);
  if (!dimensions.width || !dimensions.height || dimensions.width > 10_000 || dimensions.height > 10_000 || dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) throw new Error("Dimensi gambar tidak valid atau terlalu besar.");
}

function readUint32(bytes: Uint8Array, offset: number) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset); }

function jpegDimensions(bytes: Uint8Array) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("Struktur JPEG tidak valid.");
    const marker = bytes[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + length + 2 > bytes.length) throw new Error("Struktur JPEG tidak valid.");
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8] };
    offset += length + 2;
  }
  throw new Error("Dimensi JPEG tidak ditemukan.");
}
