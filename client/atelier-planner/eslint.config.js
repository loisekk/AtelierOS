import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // ── App code: browser environment, React rules ──
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Three.js userData/traverse + untyped Web Speech API make `any`
      // pragmatic in this codebase. Visible as warnings, not blockers.
      // TODO (Phase 12.5): type these properly, then restore to 'error'.
      '@typescript-eslint/no-explicit-any': 'warn',

      // `_`-prefixed params = intentionally unused (standard convention)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // New React Compiler rules — downgrade to warn until the proper
      // structural fixes land (key-remount for AgentModal, useVoice reorder).
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',

      // react-hooks/immutability (use-before-declare) stays ERROR — real bug.
    },
  },

  // ── Node tooling (scripts/): Node environment ──
  {
    files: ['scripts/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])