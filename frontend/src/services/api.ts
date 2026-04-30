import axios, { AxiosError } from 'axios'
import type { ApiError } from '../types/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// 요청 인터셉터 (디버깅용 로깅)
apiClient.interceptors.request.use((config) => {
  if (import.meta.env.DEV) {
    console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`)
  }
  return config
})

// 응답 인터셉터: ApiError 형태로 정규화
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // 백엔드가 보낸 ApiError 형태인 경우
    if (error.response?.data?.error) {
      return Promise.reject(error.response.data)
    }
    // 네트워크 에러 / 타임아웃 등
    const fallbackError: ApiError = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Network error',
        detail: { url: error.config?.url, status: error.response?.status },
      },
    }
    return Promise.reject(fallbackError)
  }
)

export default apiClient
