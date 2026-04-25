import { api, USE_MOCK } from "./api";
import { mockCreateNote, mockParseNote } from "./mock";
import type { Note, ParseResult } from "@/types/api";

export async function createNote(content: string): Promise<Note> {
  if (USE_MOCK) return mockCreateNote(content);
  const { data } = await api.post<Note>("/api/notes", { content });
  return data;
}

export async function parseNote(noteId: string): Promise<ParseResult> {
  if (USE_MOCK) return mockParseNote(noteId);
  const { data } = await api.post<ParseResult>("/api/parse", {
    note_id: noteId,
  });
  return data;
}

export async function deleteNote(noteId: string): Promise<void> {
  if (USE_MOCK) return;
  await api.delete(`/api/notes/${noteId}`);
}

export async function listNotes(): Promise<Note[]> {
  if (USE_MOCK) return [];
  const { data } = await api.get<Note[]>("/api/notes");
  return data;
}
