/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_GOOGLE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface GoogleCodeResponse {
  code?: string
  error?: string
}

interface GoogleCodeClient {
  requestCode: (overrideConfig?: GoogleCodeClientRequestConfig) => void
}

interface GoogleCodeClientConfig {
  client_id: string
  scope: string
  include_granted_scopes?: boolean
  ux_mode: 'popup'
  callback: (response: GoogleCodeResponse) => void
}

interface GoogleCodeClientRequestConfig {
  prompt?: string
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initCodeClient: (
          config: GoogleCodeClientConfig,
        ) => GoogleCodeClient
      }
    }
  }
}
