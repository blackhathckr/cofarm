import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

import { noMeaninglessBindings } from './base.mjs';

const noDesignLiterals = [
  {
    selector: 'JSXAttribute[name.name="className"] Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
    message: 'Colours come from theme tokens, not hex literals.',
  },
  {
    selector:
      'JSXAttribute[name.name="className"] Literal[value=/\\b(?:p|m|w|h|gap|text|rounded)-\\[/]',
    message: 'No arbitrary Tailwind values. Add a token if the scale is missing.',
  },
  {
    selector: 'JSXAttribute[name.name="style"][value.type="JSXExpressionContainer"]',
    message: 'Style with Tailwind classes, not inline style objects.',
  },
];

export function web() {
  return [
    {
      files: ['apps/admin/**/*.{ts,tsx}'],
      languageOptions: { globals: { ...globals.browser } },
      plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        'no-restricted-syntax': ['error', ...noMeaninglessBindings, ...noDesignLiterals],
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
    {
      // Inside a feature, siblings are reached relatively; an aliased import of
      // another feature's internals is how coupling spreads unnoticed. The app
      // shell is exempt, since routing is what wires features together.
      files: ['apps/admin/src/features/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/features/*/hooks/*', '@/features/*/components/*', '@/features/*/*.api'],
                message:
                  'Do not reach into another feature. Expose what is shared from its pages, or lift it to components/ or lib/.',
              },
            ],
          },
        ],
      },
    },
    {
      /**
       * Primitives compute geometry no class can express — a progress bar's
       * width. Feature code still may not.
       */
      files: ['apps/admin/src/components/ProgressBar.tsx'],
      rules: {
        'no-restricted-syntax': [
          'error',
          ...noMeaninglessBindings,
          ...noDesignLiterals.filter((rule) => !rule.selector.includes('"style"')),
        ],
      },
    },
    {
      files: ['apps/admin/**/*.tsx'],
      rules: {
        'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
        complexity: ['error', 20],
        'check-file/filename-naming-convention': [
          'error',
          {
            'apps/admin/src/components/**/*.tsx': 'PASCAL_CASE',
            'apps/admin/src/features/*/components/**/*.tsx': 'PASCAL_CASE',
            'apps/admin/src/features/*/pages/**/*.tsx': 'PASCAL_CASE',
            'apps/admin/src/app/**/*.tsx': 'KEBAB_CASE',
          },
          { ignoreMiddleExtensions: true },
        ],
      },
    },
  ];
}
