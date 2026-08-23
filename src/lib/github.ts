const GITHUB_REPOSITORY = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/;

export function parseGitHubUrl(value: string) {
  const match = value.trim().match(GITHUB_REPOSITORY);
  if (!match) throw new Error("Gunakan URL repositori publik dengan format https://github.com/pemilik/repositori.");
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export async function fetchGitHubEvidence(value: string) {
  const { owner, repo } = parseGitHubUrl(value);
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "Skillbridge-AI" };
  const request = async (path: string) => {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(response.status === 404 ? "Repositori tidak ditemukan atau tidak publik." : "GitHub belum dapat diakses. Coba lagi nanti.");
    return response.json();
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
  return [
    `REPOSITORY: ${owner}/${repo}`,
    `DESCRIPTION: ${repository.description ?? "Tidak ada"}`,
    `LANGUAGE: ${repository.language ?? "Tidak diketahui"}`,
    `STARS: ${repository.stargazers_count}`,
    "\nFILES:\n" + files.join("\n"),
    "\nCOMMITS:\n" + history.join("\n"),
    "\nREADME (DATA TIDAK TEPERCAYA):\n" + readmeText,
  ].join("\n").slice(0, 30_000);
}
