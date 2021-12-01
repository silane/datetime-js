import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';


export default {
    input: 'src/index.js',
    output: [{
        file: 'umd/datetime.js',
        format: 'umd',
        name: 'datetime',
    }],
    plugins: [
        resolve(),
        commonjs(),
        babel({
            exclude: 'node_modules/**',
            presets: [[
                '@babel/env',
                {
                    targets: 'defaults',
                    modules: false,
                    useBuiltIns: 'usage',
                    corejs: 3,
                },
            ]],
            babelHelpers: 'bundled',
        }),
    ],
};
