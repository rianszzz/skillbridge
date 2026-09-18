import type { JobPosting } from "./types.ts";

export const DELETED_JOBS_STORAGE_KEY = "skillbridge_deleted_jobs";
export const DELETED_JOBS_COOKIE_KEY = "skillbridge_deleted_jobs";

function parseIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      );
    }
  } catch {
    // Jika format bukan JSON array, parse sebagai comma-separated
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Membaca daftar ID lowongan yang telah dihapus dari localStorage dan cookie.
 * Fallback aman saat rendering di lingkungan SSR / window undefined.
 */
export function getDeletedJobIds(): Set<string> {
  const ids = new Set<string>();

  if (typeof window === "undefined") {
    return ids;
  }

  // 1. Membaca dari localStorage
  try {
    const localRaw = window.localStorage.getItem(DELETED_JOBS_STORAGE_KEY);
    parseIds(localRaw).forEach((id) => ids.add(id));
  } catch {
    // Fail-safe jika localStorage diblokir/sandbox
  }

  // 2. Membaca dari document.cookie jika ada
  try {
    const cookieRaw = getCookie(DELETED_JOBS_COOKIE_KEY);
    parseIds(cookieRaw).forEach((id) => ids.add(id));
  } catch {
    // Fail-safe jika cookie diblokir
  }

  return ids;
}

/**
 * Menandai ID lowongan sebagai dihapus (tombstone) di client side.
 * Disimpan di localStorage dan document.cookie dengan masa berlaku 1 tahun.
 */
export function markJobAsDeleted(jobId: string): void {
  if (!jobId || typeof jobId !== "string") return;
  const trimmed = jobId.trim();
  if (!trimmed) return;

  const ids = getDeletedJobIds();
  ids.add(trimmed);
  const idsArray = Array.from(ids);
  const serialized = JSON.stringify(idsArray);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(DELETED_JOBS_STORAGE_KEY, serialized);
    } catch {
      // Fail-safe
    }

    try {
      // 1 tahun = 365 hari = 31536000 detik
      const maxAge = 365 * 24 * 60 * 60;
      document.cookie = `${DELETED_JOBS_COOKIE_KEY}=${encodeURIComponent(serialized)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } catch {
      // Fail-safe
    }
  }
}

/**
 * Menyaring array lowongan kerja agar lowongan yang ada di tombstone dihapus.
 */
export function filterOutDeletedJobs<T extends { id: string } = JobPosting>(
  jobs: T[],
): T[] {
  if (!Array.isArray(jobs) || jobs.length === 0) return jobs || [];
  const deletedIds = getDeletedJobIds();
  if (deletedIds.size === 0) return jobs;
  return jobs.filter((job) => !deletedIds.has(job.id));
}

/**
 * Menghapus cache tombstone lowongan (untuk testing atau reset).
 */
export function clearDeletedJobsCache(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(DELETED_JOBS_STORAGE_KEY);
  } catch {
    // Fail-safe
  }

  try {
    document.cookie = `${DELETED_JOBS_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // Fail-safe
  }
}
