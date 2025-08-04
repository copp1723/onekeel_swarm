// Simple ESLint configuration for OneKeel Swarm
export default [
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.d.ts',
      'client/dist/**',
      'client/node_modules/**'
    ],
    rules: {
      // Basic rules to prevent errors
      'no-unused-vars': 'warn',
      'no-console': 'off', // Allow console in this project
      'no-debugger': 'warn',
      'prefer-const': 'warn',
      'no-var': 'warn'
    }
  }
];
