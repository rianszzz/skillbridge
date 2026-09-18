import test from "node:test";
import assert from "node:assert/strict";
import {
  getDeletedJobIds,
  markJobAsDeleted,
  filterOutDeletedJobs,
  clearDeletedJobsCache,
  DELETED_JOBS_STORAGE_KEY,
  DELETED_JOBS_COOKIE_KEY,
} from "./job-tombstone.ts";
import type { JobPosting } from "./types.ts";

test("getDeletedJobIds aman saat window undefined (SSR fallback)", () => {
  assert.equal(typeof DELETED_JOBS_STORAGE_KEY, "string");
  assert.equal(typeof DELETED_JOBS_COOKIE_KEY, "string");
  // Pastikan tidak melempar error saat SSR
  const ids = getDeletedJobIds();
  assert.ok(ids instanceof Set);
});

test("markJobAsDeleted dan filterOutDeletedJobs bekerja dengan localStorage & cookie tiruan", () => {
  const store = new Map<string, string>();
  let cookieStore = "";

  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };

  // Setup window & document global tiruan
  const origWindow = globalThis.window;
  const origDocument = globalThis.document;

  (globalThis as unknown as { window: unknown }).window = {
    localStorage: mockLocalStorage,
  };
  (globalThis as unknown as { document: unknown }).document = {
    get cookie() {
      return cookieStore;
    },
    set cookie(val: string) {
      // Sederhana: simpan nilai k=v
      const [pair] = val.split(";");
      cookieStore = pair;
    },
  };

  try {
    clearDeletedJobsCache();
    assert.equal(getDeletedJobIds().size, 0);

    // Tandai lowongan sebagai deleted
    markJobAsDeleted("job-101");
    markJobAsDeleted("job-102");

    const deletedIds = getDeletedJobIds();
    assert.equal(deletedIds.has("job-101"), true);
    assert.equal(deletedIds.has("job-102"), true);
    assert.equal(deletedIds.has("job-103"), false);

    // Periksa filterOutDeletedJobs
    const jobs = [
      { id: "job-101", title: "Job 1" },
      { id: "job-103", title: "Job 3" },
      { id: "job-102", title: "Job 2" },
      { id: "job-104", title: "Job 4" },
    ] as JobPosting[];

    const filtered = filterOutDeletedJobs(jobs);
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].id, "job-103");
    assert.equal(filtered[1].id, "job-104");

    // Clear cache
    clearDeletedJobsCache();
    assert.equal(getDeletedJobIds().size, 0);

    const unfiltered = filterOutDeletedJobs(jobs);
    assert.equal(unfiltered.length, 4);
  } finally {
    (globalThis as unknown as { window: unknown }).window = origWindow;
    (globalThis as unknown as { document: unknown }).document = origDocument;
  }
});
