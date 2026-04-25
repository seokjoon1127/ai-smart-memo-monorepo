import type {
  Note,
  ParseResponse,
  CreateNoteRequest,
  CreateSchedulesRequest,
  CreateSchedulesResponse,
  Schedule,
  GetSchedulesQuery,
  ScheduleDetail,
  GetConflictsQuery,
  ConflictInfo,
  GetShareBoxQuery,
  GetShareBoxResponse,
  CreateShareDocRequest,
  ShareDoc,
  ShareDocDetail,
  AcceptSuggestionRequest,
} from '../types/api'

// Mock 응답에 인공 지연 추가 (AI 처리 느낌)
export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

const NOT_IMPLEMENTED = (label: string): never => {
  throw new Error(`Mock API not implemented: ${label}`)
}

export const mockApi = {
  memo: {
    list: async (): Promise<Note[]> => NOT_IMPLEMENTED('memo.list'),
    create: async (_req: CreateNoteRequest): Promise<Note> =>
      NOT_IMPLEMENTED('memo.create'),
    delete: async (_noteId: string): Promise<{ ok: boolean }> =>
      NOT_IMPLEMENTED('memo.delete'),
    parse: async (_noteId: string): Promise<ParseResponse> =>
      NOT_IMPLEMENTED('memo.parse'),
  },

  schedule: {
    create: async (
      _req: CreateSchedulesRequest
    ): Promise<CreateSchedulesResponse> => NOT_IMPLEMENTED('schedule.create'),
    list: async (_query: GetSchedulesQuery): Promise<Schedule[]> =>
      NOT_IMPLEMENTED('schedule.list'),
    getDetail: async (_id: string): Promise<ScheduleDetail> =>
      NOT_IMPLEMENTED('schedule.getDetail'),
  },

  calendar: {
    getConflicts: async (_query: GetConflictsQuery): Promise<ConflictInfo> =>
      NOT_IMPLEMENTED('calendar.getConflicts'),
  },

  shareBox: {
    list: async (_query: GetShareBoxQuery): Promise<GetShareBoxResponse> =>
      NOT_IMPLEMENTED('shareBox.list'),
    create: async (_req: CreateShareDocRequest): Promise<ShareDoc> =>
      NOT_IMPLEMENTED('shareBox.create'),
    getDetail: async (_docId: string): Promise<ShareDocDetail> =>
      NOT_IMPLEMENTED('shareBox.getDetail'),
  },

  suggestion: {
    accept: async (
      _suggestionId: string,
      _req: AcceptSuggestionRequest
    ): Promise<Schedule> => NOT_IMPLEMENTED('suggestion.accept'),
  },
}
