module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	extends: ['plugin:@typescript-eslint/recommended'],
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	rules: {
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
		'@typescript-eslint/explicit-function-return-type': 'error',
		'@typescript-eslint/consistent-type-imports': [
			'error',
			{
				prefer: 'type-imports',
				disallowTypeAnnotations: false,
				fixStyle: 'inline-type-imports',
			},
		],
	},
};
