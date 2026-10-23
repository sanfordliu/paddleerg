/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*-test.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/strava/**/*.ts',
    'src/routes/**/*.ts',
    'src/app.ts',
    '!**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    './src/strava/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  clearMocks: true,
};
