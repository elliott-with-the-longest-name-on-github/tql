import { createQueryBuilder, isTemplateStringsArray } from './utils.js';
import { TqlError } from './error.js';
import type { CompiledQuery, Init } from './types.js';
import {
	TqlIdentifier,
	TqlIdentifiers,
	TqlList,
	TqlNode,
	TqlParameter,
	TqlQuery,
	TqlFragment,
	TqlTemplateString,
	TqlValues,
	type TqlNodeType,
	TqlSet,
} from './nodes.js';
import { build } from './build.js';

export { PostgresDialect } from './dialects/postgres.js';

export const init: Init = ({ dialect }) => {
	return {
		query: (strings, ...values): CompiledQuery => {
			const query = parseTemplate(TqlQuery, strings, values);
			const qb = createQueryBuilder();
			const d = new dialect(qb.appendToQuery, qb.appendToParams);
			const preprocessed = d.preprocess(query);
			build(d, preprocessed);
			return d.postprocess(qb.query, qb.params);
		},
		fragment: (strings, ...values) => parseTemplate(TqlFragment, strings, values),
		identifier: (id) => new TqlIdentifier(id),
		identifiers: (ids) => new TqlIdentifiers(ids),
		list: (vals) => new TqlList(vals),
		values: (entries) => new TqlValues(entries),
		set: (entries) => new TqlSet(entries),
		unsafe: (strings, ...values): TqlTemplateString => {
			if (!isTemplateStringsArray(strings) || !Array.isArray(values) || strings.length !== values.length + 1) {
				throw new TqlError('untemplated_sql_call');
			}

			// unexpectedly, concatenating a string in a tight loop is faster than using a string-builder pattern
			let result = '';
			for (let i = 0; i < strings.length; i++) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				result += strings[i]!;
				if (i === values.length) {
					continue;
				}
				result += values[i];
			}
			return new TqlTemplateString(result);
		},
	};
};

function parseTemplate<TResult extends TqlQuery | TqlFragment>(
	FragmentCtor: new (nodes: TqlNode<Exclude<TqlNodeType, 'query'>>[]) => TResult,
	strings: TemplateStringsArray,
	values: unknown[],
): TResult {
	if (!isTemplateStringsArray(strings) || !Array.isArray(values) || strings.length !== values.length + 1) {
		throw new TqlError('untemplated_sql_call');
	}

	const nodes: TqlNode<Exclude<TqlNodeType, 'query'>>[] = [];

	let nodeInsertIndex = 0;
	for (let i = 0; i < strings.length; i++) {
		// @ts-expect-error - We check right above in the loop that this index is valid
		nodes[nodeInsertIndex++] = new TqlTemplateString(strings[i]);

		if (i === values.length) {
			continue;
		}

		const otherNodeRaw = values[i];

		if (!(otherNodeRaw instanceof TqlNode)) {
			nodes[nodeInsertIndex++] = new TqlParameter(otherNodeRaw ?? null); // disallow undefined
			continue;
		}

		nodes[nodeInsertIndex++] = otherNodeRaw;
	}

	return new FragmentCtor(nodes);
}
