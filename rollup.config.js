import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: "src/reactive-element.ts",
  output: {
    file: "dist/reactive-element.js",
    format: "es",
    compact: false,
    minifyInternalExports: false
  },
  plugins: [resolve(), typescript()]
}