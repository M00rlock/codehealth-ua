export const SOURCE_FILE_PATTERNS = [
  'layouts/**/*.{ts,tsx,js,jsx,vue}',
  'composables/**/*.{ts,tsx,js,jsx}',
  'plugins/**/*.{ts,tsx,js,jsx}',
  'utils/**/*.{ts,tsx,js,jsx}',
  'stores/**/*.{ts,tsx,js,jsx}',
  'middleware/**/*.{ts,tsx,js,jsx}',

  'lib/**/*.{ts,tsx,js,jsx}',
  'shared/**/*.{ts,tsx,js,jsx}',
  'modules/**/*.{ts,tsx,js,jsx}',
  'features/**/*.{ts,tsx,js,jsx}',
  'services/**/*.{ts,tsx,js,jsx}',
  'controllers/**/*.{ts,tsx,js,jsx}',
  'routes/**/*.{ts,tsx,js,jsx}',

  'apps/**/*.{ts,tsx,js,jsx,vue}',
  'packages/**/*.{ts,tsx,js,jsx,vue}',

  '*.config.{ts,js,mjs,cjs}',
  '**/src/**/*.{ts,tsx,js,jsx,vue}',
  '**/app/**/*.{ts,tsx,js,jsx,vue}',
  '**/pages/**/*.{ts,tsx,js,jsx,vue}',
  '**/components/**/*.{ts,tsx,js,jsx,vue}',
  '**/server/**/*.{ts,tsx,js,jsx}',
  'app.vue',
  'main.{ts,js}',
  'index.{ts,js}',
];

export const TEST_FILE_PATTERNS = [
  '**/*.spec.{ts,tsx,js,jsx,vue}',
  '**/*.test.{ts,tsx,js,jsx,vue}',
  '**/__tests__/**/*.{ts,tsx,js,jsx,vue}',
];

export const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/.next/**',
  '**/.angular/**',
  '**/.vercel/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.cache/**',
  '**/tmp/**',
  '**/temp/**',

  '**/*.d.ts',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/pnpm-lock.yaml',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/bun.lockb',
];
