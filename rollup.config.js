import resolve from '@rollup/plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from '@rollup/plugin-commonjs';


module.exports = [{
    input: 'src/index.js',
    output: [{
        file: 'umd/datetime.js',
        format: 'umd',
        name: 'datetime',
    }],
    plugins: [
        resolve(),
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
        }),
        commonjs(),
    ],
}];
