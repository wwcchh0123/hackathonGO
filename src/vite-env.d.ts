/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 科大讯飞 APPID */
  readonly VITE_XUNFEI_APP_ID: string;
  /** 科大讯飞 API Secret */
  readonly VITE_XUNFEI_API_SECRET: string;
  /** 科大讯飞 API Key */
  readonly VITE_XUNFEI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
