import { createQueryBuilder, isTemplateStringsArray } from './utils.js';
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
		identifiers: (ids) => new TqlIdentifiers(ids),
		list: (vals) => new TqlList(vals),
		values: (entries) => new TqlValues(entries),
		set: (entries) => new TqlSet(entries),
		unsafe: (str) => new TqlTemplateString(str),
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
		// @ts-expect-error -- the line above this makes this clearly valid
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
