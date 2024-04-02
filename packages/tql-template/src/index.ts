import { createQueryBuilder, isTemplateStringsArray, join } from './utils.js';
import { TqlError } from './error.js';
import type { CompiledQuery, Init } from './types.js';
import {
	TqlIdentifiers,
	TqlList,
	TqlNode,
	TqlParameter,
	TqlQuery,
	TqlFragment,
	TqlTemplateString,
	TqlValues,
	TqlSet,
} from './nodes.js';
import { build } from './build.js';
import type { Tql } from './types.js';

export type * from './nodes.ts';
export type * from './types.js';
export { PostgresDialect } from './dialects/postgres.js';
export { SnowflakeDialect } from './dialects/snowflake.js';

export const init: Init = ({ dialect }) => {
	const fragment = Object.defineProperty(
		(strings: TemplateStringsArray, ...values: unknown[]) => parseTemplate(TqlFragment, strings, values),
		'join',
		join,
	) as Tql['fragment'];

	return {
		query: (strings, ...values): CompiledQuery => {
			const query = parseTemplate(TqlQuery, strings, values);
			const qb = createQueryBuilder();
			const d = new dialect(qb.appendToQuery, qb.appendToParams);
			const preprocessed = d.preprocess(query);
			build(d, preprocessed);
			return d.postprocess(qb.query, qb.params);
		},
		fragment,
		IDENTIFIER: (identifier) => new TqlIdentifiers(identifier),
		IDENTIFIERS: (identifiers) => new TqlIdentifiers(identifiers),
		LIST: (list) => new TqlList(list),
		VALUES: (entries) => new TqlValues(entries),
		SET: (entries) => new TqlSet(entries),
		UNSAFE: (str) => new TqlTemplateString(str),
	};
};

function parseTemplate<TResult extends TqlQuery | TqlFragment>(
	FragmentCtor: new (nodes: TqlNode[]) => TResult,
	strings: TemplateStringsArray,
	values: unknown[],
): TResult {
	if (!isTemplateStringsArray(strings) || !Array.isArray(values) || strings.length !== values.length + 1) {
		throw new TqlError('untemplated_sql_call');
	}

	const nodes: TqlNode[] = [];

	let nodeInsertIndex = 0;
	for (let i = 0; i < strings.length; i++) {
		// @ts-expect-error -- the line above this makes this clearly valid
		nodes[nodeInsertIndex++] = new TqlTemplateString(strings[i]);

		if (i === values.length) {
			continue;
		}

		const interpolatedValues = (Array.isArray(values[i]) ? values[i] : [values[i]]) as unknown[];

		for (const value of interpolatedValues) {
			if (!(value instanceof TqlNode)) {
				if (value instanceof TqlQuery) {
					throw new TqlError('illegal_query_recursion');
				}
				nodes[nodeInsertIndex++] = new TqlParameter(value ?? null); // disallow undefined
				continue;
			}

			nodes[nodeInsertIndex++] = value;
		}
	}

	return new FragmentCtor(nodes);
}
