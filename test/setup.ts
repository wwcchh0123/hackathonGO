/**
 * Jest 测试环境设置
 * 配置全局测试工具和扩展
 */

import '@testing-library/jest-dom';

// 模拟 window.matchMedia（MUI 需要）
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
