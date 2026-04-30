import apiClient from './api'
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
  AuthResponse,
  CreateGoogleCalendarEventRequest,
  GoogleCalendarEventResponse,
  GoogleAuthCodeRequest,
} from '../types/api'

export const realApi = {
  auth: {
    me: async (): Promise<AuthResponse> => {
      const { data } = await apiClient.get<AuthResponse>('/auth/me')
      return data
    },
    loginWithGoogleCode: async (
      req: GoogleAuthCodeRequest,
    ): Promise<AuthResponse> => {
      const { data } = await apiClient.post<AuthResponse>(
        '/auth/google/code',
        req,
      )
      return data
    },
    logout: async (): Promise<{ ok: boolean }> => {
      const { data } = await apiClient.post<{ ok: boolean }>('/auth/logout')
      return data
    },
  },

  memo: {
    list: async (): Promise<Note[]> => {
      const { data } = await apiClient.get<Note[]>('/notes')
      return data
    },
    create: async (req: CreateNoteRequest): Promise<Note> => {
      const { data } = await apiClient.post<Note>('/notes', req)
      return data
    },
    delete: async (noteId: string): Promise<{ ok: boolean }> => {
      const { data } = await apiClient.delete<{ ok: boolean }>(
        `/notes/${noteId}`,
      )
      return data
    },
    parse: async (noteId: string): Promise<ParseResponse> => {
      const { data } = await apiClient.post<ParseResponse>('/parse', {
        note_id: noteId,
      })
      return data
    },
  },

  schedule: {
    create: async (
      req: CreateSchedulesRequest,
    ): Promise<CreateSchedulesResponse> => {
      const { data } = await apiClient.post<CreateSchedulesResponse>(
        '/schedules',
        req,
      )
      return data
    },
    list: async (query: GetSchedulesQuery): Promise<Schedule[]> => {
      const { data } = await apiClient.get<Schedule[]>('/schedules', {
        params: query,
      })
      return data
    },
    getDetail: async (id: string): Promise<ScheduleDetail> => {
      const { data } = await apiClient.get<ScheduleDetail>(`/schedules/${id}`)
      return data
    },
  },

  calendar: {
    getConflicts: async (query: GetConflictsQuery): Promise<ConflictInfo> => {
      const { data } = await apiClient.get<ConflictInfo>(
        '/calendar/conflicts',
        { params: query },
      )
      return data
    },
    createGoogleEvent: async (
      req: CreateGoogleCalendarEventRequest,
    ): Promise<GoogleCalendarEventResponse> => {
      const { data } = await apiClient.post<GoogleCalendarEventResponse>(
        '/google-calendar/events',
        req,
      )
      return data
    },
  },

  shareBox: {
    list: async (query: GetShareBoxQuery): Promise<GetShareBoxResponse> => {
      const { data } = await apiClient.get<GetShareBoxResponse>('/sharebox', {
        params: query,
      })
      return data
    },
    create: async (req: CreateShareDocRequest): Promise<ShareDoc> => {
      const { data } = await apiClient.post<ShareDoc>('/sharebox', req)
      return data
    },
    getDetail: async (docId: string): Promise<ShareDocDetail> => {
      const { data } = await apiClient.get<ShareDocDetail>(
        `/sharebox/${docId}`,
      )
      return data
    },
  },

  suggestion: {
    accept: async (
      suggestionId: string,
      req: AcceptSuggestionRequest,
    ): Promise<Schedule> => {
      const { data } = await apiClient.post<Schedule>(
        `/suggestions/${suggestionId}/accept`,
        req,
      )
      return data
    },
  },

  admin: {
    reset: async (): Promise<{ ok: boolean; counts: Record<string, number> }> => {
      const { data } = await apiClient.post<{
        ok: boolean
        counts: Record<string, number>
      }>('/admin/reset')
      return data
    },
  },
}
