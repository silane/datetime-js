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
    'node-esm': {
      presets: [
        [
          '@babel/env',
          {
            targets: 'maintained node versions',
            modules: false,
            useBuiltIns: 'usage',
            corejs:3,
          },
        ],
      ],
    },
  },
};
