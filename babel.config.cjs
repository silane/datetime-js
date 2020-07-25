module.exports = {
  env: {
    'node-cjs': {
      plugins: [
        ['replace-import-extension', { extMapping: { '.js': '.cjs' } }],
         '@babel/transform-modules-commonjs',
      ],
    },
  },
};
