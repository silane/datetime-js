module.exports = {
  env: {
    'node-cjs': {
      presets: [
        [
          '@babel/env',
          {
            targets: 'maintained node versions',
            modules: 'cjs',
            useBuiltIns: 'usage',
            corejs: 3,
          },
        ],
      ],
      plugins: [
        ['replace-import-extension', { extMapping: { '.js': '.cjs' } }]
      ]
    },
  },
};
