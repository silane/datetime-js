module.exports = [{
    input: 'datetime.js',
    output: [{
        file: 'lib/datetime.umd.js',
        format: 'umd',
        name: 'datetime',
    }, {
        file: 'lib/datetime.esm.js',
        format: 'esm',
    }],
}];
