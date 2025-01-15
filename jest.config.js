module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Ruta del archivo setup
  testEnvironment: 'jsdom', // Entorno para pruebas de React y DOM
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest', // Usa Babel para transformar archivos JS, JSX, TS y TSX
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'], // Extensiones soportadas
  transformIgnorePatterns: ['/node_modules/'], // Ignora transformación de node_modules
};