/**
 * AI Smart Memo - API Contract Types
 * Source of Truth: api_contract.md (v1.0.0)
 *
 * ⚠️ 이 파일을 수정하기 전에 반드시 api_contract.md 문서를 먼저 갱신하고
 *    백엔드와 합의하세요. 양쪽 동기화가 깨지면 런타임 에러로 이어집니다.
 */

// ===== 1. Enum =====
export type EventType = 'meeting' | 'deadline' | 'event' | 'other'
export type DocCategory = 'meeting' | 'project' | 'report' | 'memo'
export type SuggestionType = 'follow_up_meeting' | 'review_session' | 'task'
export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'CONFLICT_DETECTED'
  | 'LLM_PARSE_FAILED'
  | 'EXTERNAL_SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'

// ===== 2. 도메인 모델 =====
export interface Note {
  id: string
  content: string
  created_at: string
  indexed: boolean
}

export interface ConflictInfo {
  has_conflict: boolean
  conflicting_event?: string
  suggested_times?: string[]
}

export interface ParsedEvent {
  temp_id: string
  title: string
  date: string
  is_all_day: boolean
  start_time: string | null
  end_time: string | null
  type: EventType
  participants: string[]
  location: string | null
  conflict: ConflictInfo
}

export interface Schedule {
  id: string
  title: string
  date: string
  is_all_day: boolean
  start_time: string | null
  end_time: string | null
  type: EventType
  participants: string[]
  location: string | null
  alert_minutes_before: number
  google_event_id: string | null
  source_note_id: string | null
  created_at: string
}

export interface ShareDoc {
  id: string
  title: string
  category: DocCategory
  author: string
  preview: string
  tags: string[]
  created_at: string
  indexed: boolean
}

export interface ShareDocDetail extends ShareDoc {
  full_content: string
}

export interface RelatedDoc {
  doc_id: string
  title: string
  preview: string
  relevance_score: number
  created_at: string
}

export interface Suggestion {
  suggestion_id: string
  type: SuggestionType
  title: string
  suggested_date: string
  suggested_start_time: string | null
  reason: string
  based_on_schedule_id: string
}

export interface ApiError {
  error: {
    code: ApiErrorCode
    message: string
    detail?: Record<string, unknown>
  }
}

// ===== 3. 엔드포인트 Request / Response =====

// EP2. POST /api/notes
export interface CreateNoteRequest {
  content: string
}
export type CreateNoteResponse = Note

// EP3. DELETE /api/notes/{note_id}
export interface DeleteNoteResponse {
  ok: boolean
}

// EP4. POST /api/parse
export interface ParseRequest {
  note_id: string
}
export interface ParseResponse {
  note_id: string
  events: ParsedEvent[]
}

// EP5. POST /api/schedules
export interface CreateScheduleEventInput {
  title: string
  date: string
  is_all_day: boolean
  start_time: string | null
  end_time: string | null
  type: EventType
  participants: string[]
  location: string | null
  alert_minutes_before: number
  source_note_id: string | null
}
export interface CreateSchedulesRequest {
  events: CreateScheduleEventInput[]
}
export interface CreateSchedulesResponse {
  schedules: Schedule[]
  failed: Array<{ schedule_id: string; reason: string }>
}

// EP6. GET /api/schedules?from=&to=&type=
export interface GetSchedulesQuery {
  from: string
  to: string
  type?: EventType
}
export type GetSchedulesResponse = Schedule[]

// EP7. GET /api/schedules/{schedule_id}
export interface ScheduleDetail extends Schedule {
  related_docs: RelatedDoc[]
  ai_suggestion: Suggestion | null
}
export type GetScheduleDetailResponse = ScheduleDetail

// EP8. GET /api/calendar/conflicts
export interface GetConflictsQuery {
  date: string
  start_time?: string
  end_time?: string
}
export type GetConflictsResponse = ConflictInfo

// EP9. GET /api/sharebox
export interface GetShareBoxQuery {
  q?: string
  category?: DocCategory
  limit?: number
  offset?: number
}
export interface GetShareBoxResponse {
  items: ShareDoc[]
  total: number
  limit: number
  offset: number
}

// EP10. POST /api/sharebox
export interface CreateShareDocRequest {
  title: string
  category: DocCategory
  preview: string
  tags: string[]
}
export type CreateShareDocResponse = ShareDoc

// EP11. GET /api/sharebox/{doc_id}
export type GetShareDocDetailResponse = ShareDocDetail

// EP12. POST /api/suggestions/{suggestion_id}/accept
export interface AcceptSuggestionRequest {
  alert_minutes_before: number
}
export type AcceptSuggestionResponse = Schedule

// ===== 4. 유틸 =====
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiError).error === 'object' &&
    'code' in (value as ApiError).error
  )
}

export function isAllDay(event: ParsedEvent | Schedule): boolean {
  return event.is_all_day === true || event.start_time === null
}
