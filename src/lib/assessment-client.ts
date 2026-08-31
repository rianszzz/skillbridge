"use client";
import { useEffect, useState } from "react";
import { authHeaders } from "./auth-client";
import type { AssessmentResult } from "./types";
import { responseData } from "./http-client";

export function useAssessments(id?: string) {
  const [items, setItems] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
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
