import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// 각 테스트 후 React DOM 정리
afterEach(() => {
  cleanup()
})
