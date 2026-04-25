import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('services index switch', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses mockApi when VITE_USE_MOCK=true', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    const { memoApi } = await import('./index')
    const { mockApi } = await import('./mock')
    expect(memoApi).toBe(mockApi.memo)
    vi.unstubAllEnvs()
  })

  it('uses realApi when VITE_USE_MOCK=false', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'false')
    const { memoApi } = await import('./index')
    const { realApi } = await import('./realApi')
    expect(memoApi).toBe(realApi.memo)
    vi.unstubAllEnvs()
  })

  it('exports all required namespaces', async () => {
    const services = await import('./index')
    expect(services.memoApi).toBeDefined()
    expect(services.scheduleApi).toBeDefined()
    expect(services.calendarApi).toBeDefined()
    expect(services.shareBoxApi).toBeDefined()
    expect(services.suggestionApi).toBeDefined()
  })
})
