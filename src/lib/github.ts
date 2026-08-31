const GITHUB_REPOSITORY = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/;
const MAX_GITHUB_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_FILES = 5;
const MAX_SOURCE_FILE_BYTES = 4 * 1024;
const MAX_SOURCE_BYTES = 16 * 1024;
const SOURCE_EXTENSION = /\.(?:js|jsx|ts|tsx|py|java|go|rb|php|cs)$/i;
const SKIP_SOURCE = /(?:^|\/)(?:node_modules|vendor|dist|build|coverage|\.next|generated)(?:\/|$)|(?:\.min\.|lock$)/i;

export function parseGitHubUrl(value: string) {
  const match = value.trim().match(GITHUB_REPOSITORY);
  if (!match) throw new Error("Gunakan URL repositori publik dengan format https://github.com/pemilik/repositori.");
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export async function fetchGitHubEvidence(value: string) {
  const { owner, repo } = parseGitHubUrl(value);
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "Skillbridge-AI" };
  const request = async (path: string) => {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${path}`, { headers, signal: AbortSignal.timeout(10_000), redirect: "error" });
    if (!response.ok) throw new Error(response.status === 404 ? "Repositori tidak ditemukan atau tidak publik." : "GitHub belum dapat diakses. Coba lagi nanti.");
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_GITHUB_RESPONSE_BYTES) throw new Error("Respons GitHub terlalu besar untuk diproses.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("GitHub tidak mengembalikan data.");
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      total += chunk.length;
      if (total > MAX_GITHUB_RESPONSE_BYTES) { await reader.cancel(); throw new Error("Respons GitHub terlalu besar untuk diproses."); }
      chunks.push(chunk);
    }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error("GitHub mengembalikan data tidak valid."); }
  };
  const repository = await request("");
  const [readme, tree, commits] = await Promise.all([
    request("/readme").catch(() => null),
    request(`/git/trees/${repository.default_branch}?recursive=1`).catch(() => ({ tree: [] })),
    request("/commits?per_page=10").catch(() => []),
  ]);
  const readmeText = readme?.content ? Buffer.from(readme.content, "base64").toString("utf8").slice(0, 12_000) : "README tidak tersedia";
  const files = (tree.tree ?? []).filter((item: { type: string }) => item.type === "blob").slice(0, 150).map((item: { path: string; size?: number }) => `${item.path} (${item.size ?? 0} bytes)`);
  const history = commits.slice(0, 10).map((item: { sha: string; commit: { message: string; author: { date: string } } }) => `${item.sha.slice(0, 7)} | ${item.commit.author.date} | ${item.commit.message.split("\n")[0]}`);
  const sourceCandidates = (tree.tree ?? []).filter((item: { type: string; path: string; size?: number }) => item.type === "blob" && SOURCE_EXTENSION.test(item.path) && !SKIP_SOURCE.test(item.path) && (item.size ?? MAX_SOURCE_FILE_BYTES + 1) <= MAX_SOURCE_FILE_BYTES).slice(0, MAX_SOURCE_FILES);
  let sourceBytes = 0;
  const sourceSections: string[] = [];
  for (const [index, item] of sourceCandidates.entries()) {
    const file = await request(`/contents/${item.path.split("/").map(encodeURIComponent).join("/")}`).catch(() => null);
    if (!file?.content) continue;
    const decoded = Buffer.from(file.content, "base64").toString("utf8").slice(0, Math.min(MAX_SOURCE_FILE_BYTES, MAX_SOURCE_BYTES - sourceBytes));
    if (!decoded || decoded.includes("\0")) continue;
    sourceBytes += Buffer.byteLength(decoded);
    const numbered = decoded.split("\n").map((line, lineIndex) => `${lineIndex + 1}: ${line}`).join("\n");
    sourceSections.push(`[FILE:${index + 1}:L1-L${decoded.split("\n").length}]\nPATH: ${item.path}\n${numbered}`);
    if (sourceBytes >= MAX_SOURCE_BYTES) break;
  }
  return [
    `[REPOSITORY:1]\nREPOSITORY: ${owner}/${repo}`,
    `DESCRIPTION: ${repository.description ?? "Tidak ada"}`,
    `LANGUAGE: ${repository.language ?? "Tidak diketahui"}`,
    `STARS: ${repository.stargazers_count}`,
    "\n[FILES:1]\nFILES:\n" + files.join("\n"),
    "\n[COMMITS:1]\nCOMMITS:\n" + history.join("\n"),
    "\nSOURCE FILES (DATA TIDAK TEPERCAYA):\n" + (sourceSections.join("\n\n") || "Tidak ada source file kecil yang dapat dibaca"),
    "\n[README:1]\nREADME (DATA TIDAK TEPERCAYA):\n" + readmeText,
  ].join("\n").slice(0, 30_000);
}
