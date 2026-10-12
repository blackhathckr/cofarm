import reactHooks from 'eslint-plugin-react-hooks';

import { noMeaninglessBindings } from './base.mjs';

const noStyleSheet = {
  selector:
    'ImportDeclaration[source.value="react-native"] ImportSpecifier[imported.name="StyleSheet"]',
  message: 'No StyleSheet. Style with className (Uniwind).',
};

const noStyleProp = {
  selector: 'JSXAttribute[name.name="style"][value.type="JSXExpressionContainer"]',
  message: 'No style object in feature code. Use className.',
};

const noColourLiterals = [
  {
    selector: 'JSXAttribute[name.name="className"] Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
    message: 'Colours come from @theme tokens, not hex literals.',
  },
  {
    selector:
      'JSXAttribute[name.name="className"] Literal[value=/\\b(?:p|m|w|h|gap|text|rounded)-\\[/]',
    message: 'No arbitrary Tailwind values. Add a token if the scale is missing.',
  },
];

export function native() {
  return [
    {
      files: ['apps/mobile/**/*.{ts,tsx}'],
      plugins: { 'react-hooks': reactHooks },
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
        'no-restricted-syntax': [
          'error',
          ...noMeaninglessBindings,
          noStyleSheet,
          noStyleProp,
          ...noColourLiterals,
        ],
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
    {
      /**
       * Primitives compute geometry no class can express — a progress bar's
       * width, an animated transform. Feature code still may not.
       */
      files: ['apps/mobile/src/components/ui/**/*.tsx'],
      rules: {
        'no-restricted-syntax': [
          'error',
          ...noMeaninglessBindings,
          noStyleSheet,
          ...noColourLiterals,
        ],
      },
    },
    {
      files: ['apps/mobile/**/*.tsx'],
      rules: {
        'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
        complexity: ['error', 20],
        // expo-router owns naming under app/: route groups are "(tabs)" and
        // layouts are "_layout".
        'check-file/folder-naming-convention': [
          'error',
          {
            'apps/mobile/src/components/**/': 'KEBAB_CASE',
            'apps/mobile/src/features/**/': 'KEBAB_CASE',
            'apps/mobile/src/lib/**/': 'KEBAB_CASE',
          },
        ],
        'check-file/filename-naming-convention': [
          'error',
          {
            'apps/mobile/src/components/**/*.tsx': 'PASCAL_CASE',
            'apps/mobile/src/features/*/components/**/*.tsx': 'PASCAL_CASE',
            'apps/mobile/src/features/*/screens/**/*.tsx': 'PASCAL_CASE',
            'apps/mobile/src/app/**/!(_)*.tsx': 'KEBAB_CASE',
          },
          { ignoreMiddleExtensions: true },
        ],
      },
    },
    {
      // expo-router requires a default export per route file.
      files: ['apps/mobile/src/app/**/*.tsx'],
      rules: { 'import-x/no-default-export': 'off' },
    },
  ];
}
