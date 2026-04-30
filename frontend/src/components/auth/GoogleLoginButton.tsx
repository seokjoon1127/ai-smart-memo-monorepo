import { useState } from 'react'
import { authApi } from '@/services'
import type { AuthUser } from '@/types/api'

interface Props {
    onLogin: (user: AuthUser) => void
}

const GOOGLE_SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar.events',
].join(' ')

export function GoogleLoginButton({ onLogin }: Props) {
    const [loading, setLoading] = useState(false)

    const handleClick = () => {
        if (!window.google) {
            alert('Google 로그인 스크립트를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
            return
        }

        const client = window.google.accounts.oauth2.initCodeClient({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            scope: GOOGLE_SCOPES,
            ux_mode: 'popup',
            callback: async (response) => {
                if (!response.code) {
                    alert('Google 로그인에 실패했습니다.')
                    return
                }

                try {
                    setLoading(true)
                    const result = await authApi.loginWithGoogleCode({
                        code: response.code,
                    })
                    onLogin(result.user)
                } catch {
                    alert('Google 로그인 처리 중 오류가 발생했습니다.')
                } finally {
                    setLoading(false)
                }
            },
        })

        client.requestCode({ prompt: 'consent' })
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className="h-11 w-full rounded-lg border border-toss-gray-200 bg-white px-3 text-sm font-medium text-toss-gray-700 hover:bg-toss-gray-50 disabled:opacity-60"
        >
            {loading ? '로그인 중...' : 'Google 로그인'}
        </button>
    )
}
