
declare type Recordable<T = any> = Record<string, T>


interface ImportMetaEnv extends ViteEnv {
  __: unknown
}

declare interface ViteEnv {
  VITE_GLOB_APP_TITLE: string
  VITE_PUBLIC_PATH: string
  VITE_GLOB_API_URL: string
  VITE_PORT: number
  VITE_USE_MOCK: boolean
  VITE_PROJECT_ENV:string
  VITE_BUILD_COMPRESS: 'gzip' | 'brotli' | 'none'
  VITE_BUILD_COMPRESS_DELETE_ORIGIN_FILE: boolean
}

