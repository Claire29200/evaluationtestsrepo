module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 120000,
  verbose: true,
  collectCoverageFrom: [
    "app.js",
    "Controllers/**/*.js",
    "Routes/**/*.js",
    "!**/node_modules/**",
  ],
  coverageReporters: ["text", "lcov"],
};
