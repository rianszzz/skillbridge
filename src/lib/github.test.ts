import assert from "node:assert/strict";
import test from "node:test";
import { parseGitHubUrl } from "./github.ts";

test("parser hanya menerima repository github publik", () => {
  assert.deepEqual(parseGitHubUrl("https://github.com/vercel/next.js"), { owner: "vercel", repo: "next.js" });
  assert.throws(() => parseGitHubUrl("https://github.com@evil.test/a/b"));
  assert.throws(() => parseGitHubUrl("http://github.com/a/b"));
});
