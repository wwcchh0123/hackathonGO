Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_XUNFEI_APP_ID: 'test-app-id',
        VITE_XUNFEI_API_SECRET: 'test-api-secret',
        VITE_XUNFEI_API_KEY: 'test-api-key'
      }
    }
  },
  writable: true,
  configurable: true
})

global.WebSocket = class WebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = WebSocket.OPEN
  
  constructor(url: string) {}
  send(data: any) {}
  close() {}
  addEventListener(event: string, handler: any) {}
  removeEventListener(event: string, handler: any) {}
} as any
