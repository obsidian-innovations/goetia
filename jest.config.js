/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@engine/(.*)$': '<rootDir>/src/engine/$1',
    '^@engine$': '<rootDir>/src/engine/index.ts',
  },
};
