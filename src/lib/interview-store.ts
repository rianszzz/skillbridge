import { createAdminSupabase } from "./supabase";

type InterviewMessage = { role: "user" | "assistant"; content: string };
type InterviewSession = { id: string; status: "active" | "completed"; focusAreas: string[]; messages: InterviewMessage[]; createdAt: string };

export async function loadInterview(userId: string, assessmentId: string): Promise<InterviewSession | null> {
  const db = createAdminSupabase();
  const { data: interview, error } = await db.from("interviews").select("id,status,focus_areas,created_at").eq("assessment_id", assessmentId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!interview) return null;
  const { data: messages, error: messagesError } = await db.from("interview_messages").select("role,content").eq("interview_id", interview.id).order("created_at", { ascending: true });
  if (messagesError) throw messagesError;
  return { id: interview.id, status: interview.status, focusAreas: interview.focus_areas as string[], messages: messages as InterviewMessage[], createdAt: interview.created_at };
}

export async function createInterview(userId: string, assessmentId: string, focusAreas: string[]): Promise<string> {
  const db = createAdminSupabase();
  const { data, error } = await db.from("interviews").insert({ assessment_id: assessmentId, user_id: userId, focus_areas: focusAreas }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function saveMessage(interviewId: string, role: "user" | "assistant", content: string) {
  const db = createAdminSupabase();
  const { error } = await db.from("interview_messages").insert({ interview_id: interviewId, role, content });
  if (error) throw error;
  await db.from("interviews").update({ updated_at: new Date().toISOString() }).eq("id", interviewId);
}

export async function completeInterview(interviewId: string) {
  const db = createAdminSupabase();
  const { error } = await db.from("interviews").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", interviewId);
  if (error) throw error;
}

export async function countUserAnswers(interviewId: string): Promise<number> {
  const db = createAdminSupabase();
  const { count, error } = await db.from("interview_messages").select("id", { count: "exact", head: true }).eq("interview_id", interviewId).eq("role", "user");
  if (error) throw error;
  return count ?? 0;
}
