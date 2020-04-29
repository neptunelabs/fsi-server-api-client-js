module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        "@typescript-eslint/no-inferrable-types": 0,
        "@typescript-eslint/no-this-alias": 0,
        "@typescript-eslint/interface-name-prefix": 0,
        "@typescript-eslint/member-delimiter-style": 0,
        "@typescript-eslint/no-explicit-any":0,
        "no-async-promise-executor":0

    }
};
