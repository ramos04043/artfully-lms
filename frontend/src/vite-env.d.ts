/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ZENDBX_URL: string
  readonly VITE_ZENDBX_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
