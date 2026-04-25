import { describe, it, expect } from 'vitest'
import { mockApi, sleep } from './mock'

describe('mockApi structure', () => {
  it('exposes memo namespace with required methods', () => {
    expect(typeof mockApi.memo.list).toBe('function')
    expect(typeof mockApi.memo.create).toBe('function')
    expect(typeof mockApi.memo.delete).toBe('function')
    expect(typeof mockApi.memo.parse).toBe('function')
  })

  it('exposes schedule namespace with required methods', () => {
    expect(typeof mockApi.schedule.create).toBe('function')
    expect(typeof mockApi.schedule.list).toBe('function')
    expect(typeof mockApi.schedule.getDetail).toBe('function')
  })

  it('exposes calendar namespace', () => {
    expect(typeof mockApi.calendar.getConflicts).toBe('function')
  })

  it('exposes shareBox namespace', () => {
    expect(typeof mockApi.shareBox.list).toBe('function')
    expect(typeof mockApi.shareBox.create).toBe('function')
    expect(typeof mockApi.shareBox.getDetail).toBe('function')
  })

  it('exposes suggestion namespace', () => {
    expect(typeof mockApi.suggestion.accept).toBe('function')
  })

  it('memo.list returns an array (initially empty)', async () => {
    const result = await mockApi.memo.list()
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('sleep', () => {
  it('resolves after given ms', async () => {
    const start = Date.now()
    await sleep(50)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(45) // 약간의 오차 허용
  })
})
