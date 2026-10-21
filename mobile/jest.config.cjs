module.exports = {
  preset: "jest-expo",
  cacheDirectory: "<rootDir>/.jest-cache",
  moduleNameMapper: { "^lucide-react-native$": "<rootDir>/tests/icons.tsx" },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.test.tsx"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo.*|@expo(nent)?/.*|expo-router|@react-navigation/.*|react-native-svg|lucide-react-native)/)",
  ],
};
