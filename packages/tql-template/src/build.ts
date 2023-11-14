import { TqlError } from './error';
import { TqlQuery, TqlFragment, type TqlNodeType } from './nodes';
import type { DialectImpl } from './types';

// TODO: test
export function build(dialect: DialectImpl, ast: TqlQuery | TqlFragment): void {
	const actions = {
		identifier: dialect.identifier.bind(dialect),
		identifiers: dialect.identifiers.bind(dialect),
		list: dialect.list.bind(dialect),
		values: dialect.values.bind(dialect),
		'update-set': dialect.updateSet.bind(dialect),
		string: dialect.string.bind(dialect),
		parameter: dialect.parameter.bind(dialect),
		fragment: (node) => build(dialect, node),
		query: () => {
			throw new TqlError('illegal_query_recursion');
		},
	} satisfies { [key in TqlNodeType]: (node: any) => void };
	for (const node of ast.nodes) {
		actions[node.type](node);
	}
}
