"use client";
import { useEffect, useState } from "react";
import { authHeaders } from "./auth-client";
import type { AssessmentResult } from "./types";
import { responseData } from "./http-client";

import { DEMO_SEEDS, getDemoSeed, isDemoSeedId } from "./demo-seed";

export function useAssessments(id?: string) {
  const isDemo = Boolean(id && isDemoSeedId(id));
  const seed = isDemo ? getDemoSeed(id!) : undefined;
  const initialItems = seed ? [seed, ...DEMO_SEEDS.filter((s) => s.id !== id)] : [];
  const [items, setItems] = useState<AssessmentResult[]>(initialItems);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isDemo) return;
    let active = true;
    authHeaders().then((headers) => fetch(`/api/assessments${id ? `?id=${encodeURIComponent(id)}` : ""}`, { headers })).then(async (response) => {
      const data = await responseData(response);
      if (!response.ok) throw new Error(String(data.error));
      if (active) setItems(data as unknown as AssessmentResult[]);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Riwayat gagal dibaca."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  return { items, loading, error };
}

export async function removeAssessment(id: string) {
  const response = await fetch(`/api/assessments?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: await authHeaders() });
  if (!response.ok) { const data = await responseData(response); throw new Error(String(data.error)); }
}
