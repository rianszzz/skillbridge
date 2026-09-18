import { getSupabase } from "./auth-client.ts";
import type { JobPosting } from "./types.ts";

export const JOB_SYNC_CHANNEL = "skillbridge_jobs_channel";

export type JobSyncEvent =
  | { type: "JOB_CREATED"; job: JobPosting }
  | { type: "JOB_UPDATED"; job: JobPosting }
  | { type: "JOB_DELETED"; jobId: string }
  | { type: "JOBS_REFRESH" };

export interface RealtimeJobHandlers {
  onJobCreated?: (job: JobPosting) => void;
  onJobUpdated?: (job: JobPosting) => void;
  onJobDeleted?: (jobId: string) => void;
  onRefresh?: () => void;
}

/**
 * Mengirim pesan sinkronisasi ke tab lain melalui BroadcastChannel browser.
 */
export function broadcastJobSync(event: JobSyncEvent): void {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }

  try {
    const bc = new BroadcastChannel(JOB_SYNC_CHANNEL);
    bc.postMessage(event);
    bc.close();
  } catch {
    // Fail-safe jika BroadcastChannel diblokir di sandbox iframe tertentu
  }
}

/**
 * Menginisialisasi sinkronisasi 3-lapis:
 * 1. Supabase Realtime channel postgres_changes pada tabel job_postings
 * 2. Native BroadcastChannel ('skillbridge_jobs_channel') untuk sinkronisasi antar-tab seketika
 * 3. Window focus event fail-safe
 */
export function setupJobRealtimeSync(handlers: RealtimeJobHandlers): () => void {
  let cleanupSupabase: (() => void) | null = null;
  let bc: BroadcastChannel | null = null;
  let removeFocusListener: (() => void) | null = null;

  // Lapis 1: Supabase Realtime
  if (typeof window !== "undefined") {
    try {
      const supabase = getSupabase();
      const channel = supabase
        .channel("realtime:job_postings")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "job_postings" },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as { id?: string } | null;
              if (oldRow?.id && handlers.onJobDeleted) {
                handlers.onJobDeleted(oldRow.id);
              } else {
                handlers.onRefresh?.();
              }
            } else {
              handlers.onRefresh?.();
            }
          },
        )
        .subscribe();

      cleanupSupabase = () => {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      };
    } catch {
      // Supabase Realtime fail-safe (misal konfigurasi belum lengkap di env lokal)
    }
  }

  // Lapis 2: BroadcastChannel (Antar-tab browser yang sama 0ms)
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel(JOB_SYNC_CHANNEL);
      bc.onmessage = (event: MessageEvent<JobSyncEvent>) => {
        const data = event.data;
        if (!data || typeof data !== "object") return;

        switch (data.type) {
          case "JOB_CREATED":
            if (handlers.onJobCreated) {
              handlers.onJobCreated(data.job);
            } else {
              handlers.onRefresh?.();
            }
            break;
          case "JOB_UPDATED":
            if (handlers.onJobUpdated) {
              handlers.onJobUpdated(data.job);
            } else {
              handlers.onRefresh?.();
            }
            break;
          case "JOB_DELETED":
            if (handlers.onJobDeleted) {
              handlers.onJobDeleted(data.jobId);
            } else {
              handlers.onRefresh?.();
            }
            break;
          case "JOBS_REFRESH":
            handlers.onRefresh?.();
            break;
        }
      };
    } catch {
      // ignore
    }
  }

  // Lapis 3: Window Focus Listener (Fail-safe saat pengguna kembali ke tab)
  if (typeof window !== "undefined") {
    let lastFocusRefresh = 0;
    const handleFocus = () => {
      const now = Date.now();
      // Throttle 3 detik agar tidak memicu fetch berulang saat tab switcher aktif
      if (now - lastFocusRefresh > 3000) {
        lastFocusRefresh = now;
        handlers.onRefresh?.();
      }
    };

    window.addEventListener("focus", handleFocus);
    removeFocusListener = () => {
      window.removeEventListener("focus", handleFocus);
    };
  }

  return () => {
    if (cleanupSupabase) cleanupSupabase();
    if (bc) {
      try {
        bc.close();
      } catch {
        // ignore
      }
    }
    if (removeFocusListener) removeFocusListener();
  };
}
