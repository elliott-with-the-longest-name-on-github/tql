import { TqlError } from './error.js';
import { TqlFragment, TqlNode, TqlParameter, TqlQuery } from './nodes.js';

export function isTemplateStringsArray(value: unknown): value is TemplateStringsArray {
	return Array.isArray(value) && value.hasOwnProperty('raw');
}

export function createQueryBuilder(): {
	readonly query: string;
	readonly params: unknown[];
	appendToQuery: (...values: string[]) => number;
	appendToParams: (...values: unknown[]) => number;
} {
	let query = '';
	const params: unknown[] = [];
	const appendToQuery = (...values: string[]): number => {
		query += values.join('');
		return query.length;
	};
	const appendToParams = (...values: unknown[]): number => {
		return params.push(...values);
	};
	return {
		get query(): string {
			return query;
		},
		get params(): unknown[] {
			return params;
		},
		appendToQuery,
		appendToParams,
	};
}

export function unpackNodeValue(value: unknown): TqlNode[] {
	if (value instanceof TqlQuery) {
		throw new TqlError('illegal_query_recursion');
	}
	if (value instanceof TqlFragment) {
		return value.nodes;
	}
	if (value instanceof TqlNode) {
		return [value];
	}
	return [new TqlParameter(value)];
}

export function join(delimiter: unknown, values: unknown[]): TqlFragment {
	if (values.length === 0) return new TqlFragment([]);
	const firstValue = values.shift();
	const nodes = [...unpackNodeValue(firstValue)];
	const unpackedDelimiter = unpackNodeValue(delimiter);
	for (const value of values) {
		nodes.push(...unpackedDelimiter);
		nodes.push(...unpackNodeValue(value));
	}
	return new TqlFragment(nodes);
}
