export async function responseData(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (response.headers.get("content-type")?.includes("application/json")) {
    try { return JSON.parse(text) as Record<string, unknown>; } catch {}
  }
  return { error: response.ok ? "Respons server tidak valid." : response.status === 504 ? "Penilaian melewati batas waktu. Coba lagi dengan bukti yang lebih ringkas." : text.trim().slice(0, 240) || `Request gagal (HTTP ${response.status}).` };
}
