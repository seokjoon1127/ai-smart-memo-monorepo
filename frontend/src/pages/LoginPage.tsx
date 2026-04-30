import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import type { AuthUser } from '@/types/api'

interface Props {
    onLogin: (user: AuthUser) => void
    onGuest: () => void
}

export function LoginPage({ onLogin, onGuest }: Props) {
    return (
        <div className="min-h-screen bg-toss-gray-50 flex items-center justify-center px-6">
            <div className="w-full max-w-sm rounded-lg border border-toss-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-6">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-toss-blue text-sm font-bold text-white">
                        N
                    </div>
                    <h1 className="text-xl font-bold text-toss-gray-900">
                        AI Smart Memo
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-toss-gray-500">
                        Google 계정으로 로그인하거나 게스트 모드로 체험할 수 있어요.
                    </p>
                </div>

                <div className="space-y-3">
                    <GoogleLoginButton onLogin={onLogin} />

                    <button
                        type="button"
                        onClick={onGuest}
                        className="w-full rounded-lg bg-toss-gray-100 px-3 py-2 text-sm font-medium text-toss-gray-700 hover:bg-toss-gray-200"
                    >
                        게스트 모드로 들어가기
                    </button>
                </div>
            </div>
        </div>
    )
}
