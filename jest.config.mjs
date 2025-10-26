export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    // Exclude large integration/service files from unit coverage
    '!src/services/speech/**',
    '!src/hooks/useSpeechRecognition.ts',
    '!src/pages/chat/ChatPage.tsx',
    '!src/components/VncTestPanel.tsx'
  ],
  globals: {
    'import.meta': {
      env: {
        VITE_XUNFEI_APP_ID: 'test_app_id',
        VITE_XUNFEI_API_SECRET: 'test_api_secret',
        VITE_XUNFEI_API_KEY: 'test_api_key',
      }
    }
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
      }
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-markdown|remark-gfm|rehype-highlight|unist-util-visit|unist-util-is|unified|bail|is-plain-obj|trough|vfile|vfile-message|mdast-util-from-markdown|mdast-util-to-markdown|micromark|decode-named-character-reference|character-entities|mdast-util-to-string|mdast-util-gfm|mdast-util-find-and-replace|escape-string-regexp|hast-util-to-html|hast-util-sanitize|html-void-elements|property-information|space-separated-tokens|comma-separated-tokens|hast-util-whitespace)/)'
  ],
};
