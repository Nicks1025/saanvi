module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/__mocks__/uuid.js'
  }
};
