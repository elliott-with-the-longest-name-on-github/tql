import { build } from './build';
import { createTestDialect } from './dialects/test';
import { TqlIdentifiers, TqlList, TqlParameter, TqlQuery, TqlSet, TqlTemplateString, TqlValues } from './nodes';
import { describe, it, expect, beforeEach } from 'vitest';
import type { DialectImpl } from './types';
import { TqlError } from './error';

describe('build', () => {
	const { Dialect, mocks } = createTestDialect();
	let instance: DialectImpl;
	beforeEach(() => {
		instance = new Dialect(
			() => {
				return 0;
			},
			() => {
				return 0;
			},
		);
	});

	it.each([
		{
			type: 'identifiers',
			node: new TqlQuery([new TqlIdentifiers('hello')]),
			expect: (): void => {
				expect(mocks.identifiers).toHaveBeenCalledTimes(1);
			},
		},
		{
			type: 'list',
			node: new TqlQuery([new TqlList(['hello', 'world'])]),
			expect: (): void => {
				expect(mocks.list).toHaveBeenCalledTimes(1);
			},
		},
		{
			type: 'values',
			node: new TqlQuery([new TqlValues({ hello: 'world' })]),
			expect: (): void => {
				expect(mocks.values).toHaveBeenCalledTimes(1);
			},
		},
		{
			type: 'set',
			node: new TqlQuery([new TqlSet({ hello: 'world' })]),
			expect: (): void => {
				expect(mocks.set).toHaveBeenCalledTimes(1);
			},
		},
		{
			type: 'templateString',
			node: new TqlQuery([new TqlTemplateString('hello')]),
			expect: (): void => {
				expect(mocks.templateString).toHaveBeenCalledTimes(1);
			},
		},
		{
			type: 'parameter',
			node: new TqlQuery([new TqlParameter('hello')]),
			expect: (): void => {
				expect(mocks.parameter).toHaveBeenCalledTimes(1);
			},
		},
	])('calls the correct method given a node type: $type', ({ node, expect }) => {
		build(instance, node);
		expect();
	});

	it('throws if someone sneaks in a non-TQL-node', () => {
		// @ts-expect-error - Yes, this is impossible with TypeScript
		const q = new TqlQuery([new TqlTemplateString('hi'), 'hi']);
		let error: Error | null = null;
		try {
			build(instance, q);
		} catch (e) {
			error = e as Error;
		}
		expect(error).toBeInstanceOf(TqlError);
		expect(error).toHaveProperty('code', 'illegal_node_type_in_build');
	});
});
