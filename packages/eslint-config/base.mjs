import js from '@eslint/js';
import checkFile from 'eslint-plugin-check-file';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const MEANINGLESS_NAMES =
  'data|data2|result|result2|res2|info|obj|val|temp|tmp|foo|bar|stuff|thing|things|arr|list2';

const meaninglessNameMessage =
  'Name the value after what it holds, not its shape (money.ts, partnerShares, readiness).';

export const noMeaninglessBindings = [
  {
    selector: `VariableDeclarator > Identifier.id[name=/^(?:${MEANINGLESS_NAMES})$/]`,
    message: meaninglessNameMessage,
  },
  {
    selector: `:matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression) > Identifier.params[name=/^(?:${MEANINGLESS_NAMES})$/]`,
    message: meaninglessNameMessage,
  },
];

export const ignores = {
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.expo/**',
    '**/coverage/**',
    'apps/api/src/db/migrations/**',
    'apps/admin/src/components/ui/**',
    'apps/mobile/src/uniwind-types.d.ts',
    'apps/mobile/expo-env.d.ts',
  ],
};

export function base({ tsconfigRootDir }) {
  return [
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
        globals: { ...globals.es2023 },
      },
      plugins: { 'import-x': importX, 'check-file': checkFile },
      settings: {
        'import-x/resolver': { node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] } },
      },
      rules: {
        // — module hygiene —
        'import-x/no-cycle': ['error', { maxDepth: Infinity }],
        'import-x/no-self-import': 'error',
        'import-x/no-duplicates': 'error',
        'import-x/no-default-export': 'error',
        'import-x/first': 'error',
        'import-x/newline-after-import': 'error',

        // — the slop rules —
        'no-console': 'error',
        'no-alert': 'error',
        'no-debugger': 'error',
        'no-warning-comments': [
          'error',
          { terms: ['todo', 'fixme', 'xxx', 'hack'], location: 'anywhere' },
        ],
        'no-restricted-syntax': ['error', ...noMeaninglessBindings],
        'max-lines': ['warn', { max: 250, skipBlankLines: true, skipComments: true }],
        'max-lines-per-function': [
          'warn',
          { max: 60, skipBlankLines: true, skipComments: true, IIFEs: true },
        ],
        'max-depth': ['error', 3],
        complexity: ['error', 12],
        'max-params': ['error', 4],
        eqeqeq: ['error', 'always'],
        curly: ['error', 'multi-line'],
        'prefer-const': 'error',
        'no-else-return': ['error', { allowElseIf: false }],
        'no-lonely-if': 'error',
        'no-nested-ternary': 'error',
        'no-param-reassign': 'error',
        'no-useless-rename': 'error',
        'object-shorthand': ['error', 'always'],
        'prefer-template': 'error',

        // Swallowing an error hides the bug. Everything reaches the one handler.
        'no-empty': ['error', { allowEmptyCatch: false }],

        // — typescript —
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
        ],
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/explicit-module-boundary-types': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/no-confusing-void-expression': [
          'error',
          { ignoreArrowShorthand: true },
        ],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/require-await': 'error',
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        '@typescript-eslint/naming-convention': [
          'error',
          { selector: 'default', format: ['camelCase'] },
          { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
          { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
          { selector: 'function', format: ['camelCase', 'PascalCase'] },
          { selector: 'typeLike', format: ['PascalCase'] },
          { selector: 'enumMember', format: ['PascalCase'] },
          { selector: 'objectLiteralProperty', format: null },
          { selector: 'typeProperty', format: null },
          { selector: 'import', format: ['camelCase', 'PascalCase'] },
          {
            selector: 'variable',
            modifiers: ['const'],
            types: ['function'],
            format: ['camelCase', 'PascalCase'],
          },
        ],

        // — file naming —
        'check-file/filename-naming-convention': [
          'error',
          { '**/*.{ts,js,mjs}': 'KEBAB_CASE' },
          { ignoreMiddleExtensions: true },
        ],
        'check-file/folder-naming-convention': ['error', { 'src/**/': 'KEBAB_CASE' }],
        'check-file/filename-blocklist': [
          'error',
          {
            '**/utils.ts': '*.<domain>.ts',
            '**/helpers.ts': '*.<domain>.ts',
            '**/misc.ts': '*.<domain>.ts',
            '**/common.ts': '*.<domain>.ts',
            'apps/**/index.ts': '*.<named-file>.ts',
          },
          {
            errorMessage:
              'Grab-bag filenames rot. Name the file after its domain (money.ts, share.ts) instead of "{{ target }}".',
          },
        ],
      },
    },
    {
      files: ['**/*.{mjs,cjs,js}'],
      languageOptions: {
        globals: globals.node,
        parserOptions: { projectService: false, project: null },
      },
      ...tseslint.configs.disableTypeChecked,
    },
    {
      // Metro and other native tooling still load CommonJS config.
      files: ['**/*.{cjs,js}'],
      languageOptions: { sourceType: 'commonjs', globals: globals.node },
      rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
    {
      files: ['**/*.config.{ts,js,mjs}', '**/*.{mjs,cjs}', '**/scripts/**'],
      rules: {
        'import-x/no-default-export': 'off',
        'no-console': 'off',
        'check-file/filename-blocklist': 'off',
        'max-lines': 'off',
        'max-lines-per-function': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
  ];
}
