module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Ruta del archivo setup
  testEnvironment: 'jsdom', // Entorno para pruebas de React y DOM
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest', // Usa Babel para transformar archivos JS, JSX, TS y TSX
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/test/mocks/vscode.ts',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/themes/**',
    '!src/theme/**',
    '!src/ui/**',
    '!src/translations.ts',
    '!src/extension.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'], // Extensiones soportadas
  transformIgnorePatterns: ['/node_modules/'], // Ignora transformación de node_modules
};