import { describe, it, expect } from 'vitest'
import { isApiError, isAllDay, type ParsedEvent, type Schedule } from './api'

describe('isApiError', () => {
  it('returns true for valid ApiError shape', () => {
    const err = { error: { code: 'NOT_FOUND', message: 'not found' } }
    expect(isApiError(err)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isApiError(null)).toBe(false)
  })

  it('returns false for plain object without error key', () => {
    expect(isApiError({ message: 'foo' })).toBe(false)
  })

  it('returns false for error key with wrong shape', () => {
    expect(isApiError({ error: 'string' })).toBe(false)
  })

  it('returns false for primitive', () => {
    expect(isApiError('string')).toBe(false)
    expect(isApiError(42)).toBe(false)
  })
})

describe('isAllDay', () => {
  it('returns true when is_all_day=true', () => {
    const event: ParsedEvent = {
      temp_id: 'evt_tmp_1',
      title: 'test',
      date: '2026-04-25',
      is_all_day: true,
      start_time: null,
      end_time: null,
      type: 'deadline',
      participants: [],
      location: null,
      conflict: { has_conflict: false },
    }
    expect(isAllDay(event)).toBe(true)
  })

  it('returns true when start_time is null even if is_all_day=false', () => {
    const event: ParsedEvent = {
      temp_id: 'evt_tmp_1',
      title: 'test',
      date: '2026-04-25',
      is_all_day: false,
      start_time: null,
      end_time: null,
      type: 'event',
      participants: [],
      location: null,
      conflict: { has_conflict: false },
    }
    expect(isAllDay(event)).toBe(true)
  })

  it('returns false when both is_all_day=false and start_time exists', () => {
    const schedule: Schedule = {
      id: 'sch_001',
      title: 'test',
      date: '2026-04-25',
      is_all_day: false,
      start_time: '15:00',
      end_time: '16:00',
      type: 'meeting',
      participants: [],
      location: null,
      alert_minutes_before: 10,
      google_event_id: null,
      source_note_id: null,
      created_at: '2026-04-22T10:00:00+09:00',
    }
    expect(isAllDay(schedule)).toBe(false)
  })
})
