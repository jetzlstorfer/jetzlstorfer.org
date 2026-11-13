import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', '.astro/**', 'src/assets/fetched/**', 'src/data/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    ignores: ['**/*.astro/**'],
    languageOptions: {
      globals: globals.node,
    },
  },
  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    files: ['**/*.astro/*.js'],
    languageOptions: {
      globals: globals.browser,
    },
  },
];
