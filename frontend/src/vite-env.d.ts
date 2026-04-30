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
  requestCode: () => void
}

interface GoogleCodeClientConfig {
  client_id: string
  scope: string
  ux_mode: 'popup'
  callback: (response: GoogleCodeResponse) => void
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
