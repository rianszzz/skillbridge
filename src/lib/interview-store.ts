import { createAdminSupabase } from "./supabase";

type InterviewMessage = { role: "user" | "assistant"; content: string };
type InterviewSession = { id: string; status: "active" | "completed"; focusAreas: string[]; messages: InterviewMessage[]; createdAt: string };

function isTableMissing(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return e.code === "PGRST204" || e.code === "PGRST200" || e.code === "42P01" || /does not exist|schema cache/i.test(e.message ?? "");
}

export async function loadInterview(userId: string, assessmentId: string): Promise<InterviewSession | null> {
  try {
    const db = createAdminSupabase();
    const { data: interview, error } = await db.from("interviews").select("id,status,focus_areas,created_at").eq("assessment_id", assessmentId).eq("user_id", userId).maybeSingle();
    if (error) {
      if (isTableMissing(error)) return null;
      throw error;
    }
    if (!interview) return null;
    const { data: messages, error: messagesError } = await db.from("interview_messages").select("role,content").eq("interview_id", interview.id).order("created_at", { ascending: true });
    if (messagesError) {
      if (isTableMissing(messagesError)) return null;
      throw messagesError;
    }
    return { id: interview.id, status: interview.status, focusAreas: interview.focus_areas as string[], messages: messages as InterviewMessage[], createdAt: interview.created_at };
  } catch (cause) {
    if (isTableMissing(cause)) return null;
    throw cause;
  }
}

export async function createInterview(userId: string, assessmentId: string, focusAreas: string[]): Promise<string | null> {
  try {
    const db = createAdminSupabase();
    const { data, error } = await db.from("interviews").insert({ assessment_id: assessmentId, user_id: userId, focus_areas: focusAreas }).select("id").single();
    if (error) {
      if (isTableMissing(error)) return null;
      throw error;
    }
    return data.id;
  } catch (cause) {
    if (isTableMissing(cause)) return null;
    throw cause;
  }
}

export async function saveMessage(interviewId: string, role: "user" | "assistant", content: string) {
  try {
    const db = createAdminSupabase();
    const { error } = await db.from("interview_messages").insert({ interview_id: interviewId, role, content });
    if (error && !isTableMissing(error)) throw error;
    await db.from("interviews").update({ updated_at: new Date().toISOString() }).eq("id", interviewId);
  } catch (cause) {
    if (!isTableMissing(cause)) throw cause;
  }
}

export async function completeInterview(interviewId: string) {
  try {
    const db = createAdminSupabase();
    const { error } = await db.from("interviews").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", interviewId);
    if (error && !isTableMissing(error)) throw error;
  } catch (cause) {
    if (!isTableMissing(cause)) throw cause;
  }
}

export async function countUserAnswers(interviewId: string): Promise<number> {
  try {
    const db = createAdminSupabase();
    const { count, error } = await db.from("interview_messages").select("id", { count: "exact", head: true }).eq("interview_id", interviewId).eq("role", "user");
    if (error) {
      if (isTableMissing(error)) return 0;
      throw error;
    }
    return count ?? 0;
  } catch (cause) {
    if (isTableMissing(cause)) return 0;
    throw cause;
  }
}
