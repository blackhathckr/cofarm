import { api, base, ignores, native, web } from '@cofarm/eslint-config';

export default [
  ignores,
  ...base({ tsconfigRootDir: import.meta.dirname }),
  ...api(),
  ...web(),
  ...native(),
];
