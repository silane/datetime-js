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
    },
  },
};
