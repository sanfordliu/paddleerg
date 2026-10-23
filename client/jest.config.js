/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*-test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  collectCoverageFrom: [
    'src/metrics/**/*.{ts,tsx}',
    'src/ble/ftms.ts',
    'src/ble/heartRate.ts',
    'src/ble/constants.ts',
    'src/strava/config.ts',
    'src/strava/tcx.ts',
    'src/components/settings/numberInput.ts',
    '!**/*.d.ts',
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
    './src/metrics/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/ble/ftms.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
