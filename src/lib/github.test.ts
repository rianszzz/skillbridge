import assert from "node:assert/strict";
import test from "node:test";
import { fetchGitHubEvidence, parseGitHubUrl } from "./github.ts";

test("parser hanya menerima repository github publik", () => {
  assert.deepEqual(parseGitHubUrl("https://github.com/vercel/next.js"), { owner: "vercel", repo: "next.js" });
  assert.throws(() => parseGitHubUrl("https://github.com@evil.test/a/b"));
  assert.throws(() => parseGitHubUrl("http://github.com/a/b"));
});

test("extractor mengambil source kecil dengan marker file dan nomor baris", async () => {
  const original = globalThis.fetch;
  const payloads = new Map([
    ["", { default_branch: "main", description: "Demo", language: "JavaScript", stargazers_count: 0 }],
    ["/readme", { content: Buffer.from("# Demo\nJalankan npm test.").toString("base64") }],
    ["/git/trees/main?recursive=1", { tree: [{ type: "blob", path: "src/app.js", size: 40 }, { type: "blob", path: "dist/app.min.js", size: 20 }] }],
    ["/commits?per_page=10", [{ sha: "abcdef123", commit: { message: "feat: app", author: { date: "2026-01-01" } } }]],
    ["/contents/src/app.js", { content: Buffer.from("export const add = (a, b) => a + b;\n").toString("base64") }],
  ]);
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname.replace("/repos/example/demo", "") + new URL(String(input)).search;
    const body = JSON.stringify(payloads.get(path));
    return new Response(body, { status: 200, headers: { "content-length": String(body.length) } });
  };
  try {
    const evidence = await fetchGitHubEvidence("https://github.com/example/demo");
    assert.match(evidence, /\[FILE:1:L1-L2\]/);
    assert.match(evidence, /PATH: src\/app\.js/);
    assert.match(evidence, /1: export const add/);
    assert.doesNotMatch(evidence, /PATH: dist/);
  } finally { globalThis.fetch = original; }
});
