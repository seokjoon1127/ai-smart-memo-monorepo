import { describe, it, expect, beforeEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from './api'

describe('apiClient interceptor', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  it('returns response data on success', async () => {
    mock.onGet('/test').reply(200, { id: 'note_001', content: 'hello' })
    const res = await apiClient.get('/test')
    expect(res.data).toEqual({ id: 'note_001', content: 'hello' })
  })

  it('passes through ApiError shape from server', async () => {
    const errorBody = {
      error: { code: 'NOT_FOUND', message: 'Note not found' },
    }
    mock.onGet('/test').reply(404, errorBody)

    await expect(apiClient.get('/test')).rejects.toEqual(errorBody)
  })

  it('wraps network error as INTERNAL_ERROR', async () => {
    mock.onGet('/test').networkError()

    await expect(apiClient.get('/test')).rejects.toMatchObject({
      error: { code: 'INTERNAL_ERROR' },
    })
  })

  it('wraps non-ApiError 500 as INTERNAL_ERROR', async () => {
    mock.onGet('/test').reply(500, 'plain text error')

    await expect(apiClient.get('/test')).rejects.toMatchObject({
      error: { code: 'INTERNAL_ERROR' },
    })
  })
})
