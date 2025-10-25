export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/test/**/*.test.ts'],
      testEnvironment: 'node',
      extensionsToTreatAsEsm: ['.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          useESM: true,
        }],
      },
    },
    {
      displayName: 'dom',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/test/**/*.test.tsx'],
      testEnvironment: 'jsdom',
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            jsx: 'react'
          }
        }],
      },
    }
  ],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
};