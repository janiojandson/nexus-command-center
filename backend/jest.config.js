/**
 * ============================================================
 * NEXUS COMMAND CENTER — Jest Configuration
 * ============================================================
 */

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'middleware/**/*.js',
    'config/**/*.js',
    'controllers/**/*.js',
    'services/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
};
