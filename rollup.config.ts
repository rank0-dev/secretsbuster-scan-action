// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'

const config = {
  input: 'src/index.ts',
  output: {
    esModule: true,
    file: 'dist/index.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [
    json(),
    typescript({
      tsconfig: false,
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        lib: ['ES2022'],
        moduleResolution: 'node',
        resolveJsonModule: true,
        allowSyntheticDefaultImports: true
      }
    }),
    nodeResolve({ preferBuiltins: true }),
    commonjs()
  ]
}

export default config
