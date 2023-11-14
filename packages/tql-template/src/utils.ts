export function isTemplateStringsArray(value: unknown): value is TemplateStringsArray {
	return Array.isArray(value) && value.hasOwnProperty('raw');
}

// TODO: Test
export function createQueryBuilder(): {
	readonly query: string;
	readonly params: unknown[];
	appendToQuery: (...values: string[]) => number;
	appendToParams: (...values: unknown[]) => number;
} {
	let query = '';
	let params: unknown[] = [];
	const appendToQuery = (...values: string[]) => {
		query += values.join('');
		return query.length;
	};
	const appendToParams = (...values: unknown[]) => {
		return params.push(...values);
	};
	return {
		get query() {
			return query;
		},
		get params() {
			return params;
		},
		appendToQuery,
		appendToParams,
	};
}

// TODO: test
export function pluralize(str: string, plural: boolean, suffix: string = 's'): string {
	if (plural) {
		return `${str}${suffix}`;
	}
	return str;
}
