import { TqlError } from './error.js';
import { type TqlQuery, type TqlFragment, type TqlNodeType, TqlNode } from './nodes.js';
import type { DialectImpl } from './types.js';

export function build(dialect: DialectImpl, ast: TqlQuery | TqlFragment): void {
	const actions = {
		identifiers: dialect.identifiers.bind(dialect),
		list: dialect.list.bind(dialect),
		values: dialect.values.bind(dialect),
		set: dialect.set.bind(dialect),
		templateString: dialect.templateString.bind(dialect),
		parameter: dialect.parameter.bind(dialect),
		fragment: (node) => build(dialect, node),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} satisfies { [key in TqlNodeType]: (node: any) => void };
	for (const node of ast.nodes) {
		if (!(node instanceof TqlNode)) {
			throw new TqlError('illegal_node_type_in_build', node);
		}
		actions[node.type](node);
	}
}
