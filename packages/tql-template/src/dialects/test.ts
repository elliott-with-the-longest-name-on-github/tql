import type { Dialect, DialectImpl } from '../types.js';
import { BaseDialect } from '../dialect.js';
import { vi, type MockedFunction } from 'vitest';

export function createTestDialect(): {
	Dialect: Dialect;
	mocks: {
		string: MockedFunction<DialectImpl['string']>;
		parameter: MockedFunction<DialectImpl['parameter']>;
		identifier: MockedFunction<DialectImpl['identifier']>;
		identifiers: MockedFunction<DialectImpl['identifiers']>;
		list: MockedFunction<DialectImpl['list']>;
		values: MockedFunction<DialectImpl['values']>;
		updateSet: MockedFunction<DialectImpl['updateSet']>;
		preprocess: MockedFunction<DialectImpl['preprocess']>;
		postprocess: MockedFunction<DialectImpl['postprocess']>;
	};
} {
	const mocks = {
		string: vi.fn(),
		parameter: vi.fn(),
		identifier: vi.fn(),
		identifiers: vi.fn(),
		list: vi.fn(),
		values: vi.fn(),
		updateSet: vi.fn(),
		preprocess: vi.fn((fragment) => fragment),
		postprocess: vi.fn<[string, unknown[]], [string, unknown[]]>((query, params) => [query, params]),
	};
	class TestDialect extends BaseDialect implements DialectImpl {
		string = mocks.string;
		parameter = mocks.parameter;
		identifier = mocks.identifier;
		identifiers = mocks.identifiers;
		list = mocks.list;
		values = mocks.values;
		updateSet = mocks.updateSet;
		preprocess = mocks.preprocess;
		postprocess = mocks.postprocess;
	}
	return {
		Dialect: TestDialect,
		mocks,
	};
}
