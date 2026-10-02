import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['dist', 'coverage', '.planning', '.claude', '.gsd', 'supabase/.temp', 'data'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    files: ['src/**/*.tsx'],
    // main.tsx is the entry point: it renders and exports nothing, so fast-refresh export rules do not apply.
    ignores: ['src/main.tsx'],
    extends: [reactRefresh.configs.vite],
  },
  {
    // shadcn convention: the Button file also exports its cva variants (reused by link-styled anchors).
    files: ['src/components/ui/button.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true, allowExportNames: ['buttonVariants'] },
      ],
    },
  },
  {
    files: ['tests/**/*.ts', 'vite.config.ts', 'scripts/**/*.{js,ts}', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
)
