import { mockApi } from './mock'
import { realApi } from './realApi'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

if (import.meta.env.DEV) {
  console.info(`[API] Using ${USE_MOCK ? 'MOCK' : 'REAL'} backend`)
}

export const memoApi = USE_MOCK ? mockApi.memo : realApi.memo
export const scheduleApi = USE_MOCK ? mockApi.schedule : realApi.schedule
export const calendarApi = USE_MOCK ? mockApi.calendar : realApi.calendar
export const shareBoxApi = USE_MOCK ? mockApi.shareBox : realApi.shareBox
export const suggestionApi = USE_MOCK
  ? mockApi.suggestion
  : realApi.suggestion

export const adminApi = USE_MOCK
  ? {
      reset: async () => ({ ok: true, counts: {} as Record<string, number> }),
    }
  : realApi.admin
