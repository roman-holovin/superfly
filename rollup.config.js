import babel from 'rollup-plugin-babel';
import { sizeSnapshot } from 'rollup-plugin-size-snapshot';
import { terser } from 'rollup-plugin-terser';

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/superfly.js',
      format: 'umd',
      name: 'superfly',
    },
    plugins: [sizeSnapshot(), babel()],
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/superfly.es.js',
      format: 'esm',
    },
    plugins: [sizeSnapshot()],
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/superfly.min.js',
      format: 'umd',
      name: 'superfly',
    },
    plugins: [sizeSnapshot(), terser(), babel()],
  },
];
