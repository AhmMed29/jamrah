module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/unit/**/*.test.js', '<rootDir>/tests/visual/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup/jest.setup.js'],
  moduleNameMapper: {
    '^\.\./\.\./src/js/(.*)$': '<rootDir>/src/js/$1'
  },
  verbose: true,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'src/js/**/*.js',
    '!src/js/lib/**',
    '!src/js/**/*.min.js'
  ]
}
