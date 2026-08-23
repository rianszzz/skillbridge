import { getDocument } from "unpdf/pdfjs";

export const MAX_FILE_BYTES = 4 * 1024 * 1024;

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
  return type;
}

export async function extractPdfText(bytes: Uint8Array) {
  const document = await getDocument({ data: bytes }).promise;
  if (document.numPages > 15) throw new Error("Laporan PDF maksimal 15 halaman.");
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " ").trim();
    pages.push(`[PAGE:${pageNumber}]\n${text}`);
  }
  const text = pages.join("\n\n").slice(0, 30_000);
  if (text.replace(/\[PAGE:\d+\]/g, "").trim().length < 100) throw new Error("Teks laporan tidak ditemukan. Gunakan PDF dengan text layer, bukan hasil scan.");
  return { text, pages: pages.length };
}
