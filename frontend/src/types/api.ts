export type EventType = "meeting" | "deadline" | "event" | "other";

export interface Note {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface ConflictInfo {
  has_conflict: boolean;
  conflicting_event?: string | null;
  suggested_times?: string[] | null;
}

export interface ParsedEvent {
  temp_id: string;
  title: string;
  date: string;
  time?: string | null;
  duration_min?: number | null;
  type: EventType;
  participants: string[];
  conflict: ConflictInfo;
}

export interface ParseResult {
  note_id: string;
  events: ParsedEvent[];
}

export interface ApprovedEvent {
  temp_id: string;
  title: string;
  date: string;
  time?: string | null;
  duration_min?: number | null;
  type: EventType;
  participants: string[];
}

export interface RelatedNote {
  note_id: string;
  content: string;
  relevance_score: number;
  created_at: string;
}

export interface RagSummary {
  summary: string;
  source_note_ids: string[];
  generated_at: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  title: string;
  date: string;
  time?: string | null;
  duration_min?: number | null;
  type: EventType;
  source_note_id: string;
  created_at: string;
}

export interface ScheduleDetail extends Schedule {
  related_notes: RelatedNote[];
  rag_summary?: RagSummary | null;
}

export interface ConflictResponse {
  detail: string;
  conflicts: { temp_id: string; conflict: ConflictInfo }[];
}
