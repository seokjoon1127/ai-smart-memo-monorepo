import type { HttpHandler } from 'msw'

// Day 6에서 실제 핸들러로 채울 예정
// 지금은 빈 배열만 export
//
// 사용 예 (Day 6):
//   import { http, HttpResponse } from 'msw'
//   http.get('/api/notes', () => HttpResponse.json([...]))
//   http.post('/api/parse', () => HttpResponse.json({...}))

export const handlers: HttpHandler[] = []
