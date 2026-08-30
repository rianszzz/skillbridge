const injectionPatterns = [
  /ignore (all |any )?(previous|prior|system) instructions?/i,
  /(?:reveal|print|repeat|show).{0,30}(?:system prompt|hidden instructions?)/i,
  /(?:act|behave|respond) as (?:the )?(?:system|assistant|developer)/i,
  /(?:give|assign|use).{0,20}(?:score|nilai).{0,10}(?:100|highest|tertinggi)/i,
  /<\/?(?:system|assistant|developer)>/i,
];
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp_|github_pat_|sk_live_|sk-proj-)[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];

export function secureEvidence(value: string) {
  const normalized = value.normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
  if (secretPatterns.some((pattern) => pattern.test(normalized))) throw new Error("Bukti mengandung pola credential atau private key. Hapus rahasia sebelum mengirim.");
  if (injectionPatterns.some((pattern) => pattern.test(normalized))) throw new Error("Bukti memuat instruksi yang dapat memengaruhi penilai AI. Hapus instruksi tersebut sebelum mengirim.");
  return normalized;
}
