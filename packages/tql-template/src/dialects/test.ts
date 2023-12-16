import type { Dialect, DialectImpl } from '../types.js';
import { BaseDialect } from '../dialect.js';
import { vi, type MockedFunction } from 'vitest';

export function createTestDialect(): {
	Dialect: Dialect;
	mocks: {
		templateString: MockedFunction<DialectImpl['templateString']>;
		parameter: MockedFunction<DialectImpl['parameter']>;
		identifiers: MockedFunction<DialectImpl['identifiers']>;
		list: MockedFunction<DialectImpl['list']>;
		values: MockedFunction<DialectImpl['values']>;
		set: MockedFunction<DialectImpl['set']>;
		preprocess: MockedFunction<DialectImpl['preprocess']>;
		postprocess: MockedFunction<DialectImpl['postprocess']>;
	};
} {
	const mocks = {
		templateString: vi.fn(),
		parameter: vi.fn(),
		identifiers: vi.fn(),
		list: vi.fn(),
		values: vi.fn(),
		set: vi.fn(),
		preprocess: vi.fn((fragment) => fragment),
		postprocess: vi.fn<[string, unknown[]], [string, unknown[]]>((query, params) => [query, params]),
	};
	class TestDialect extends BaseDialect implements DialectImpl {
		templateString = mocks.templateString;
		parameter = mocks.parameter;
		identifiers = mocks.identifiers;
		list = mocks.list;
		values = mocks.values;
		set = mocks.set;
		preprocess = mocks.preprocess;
		postprocess = mocks.postprocess;
	}
	return {
		Dialect: TestDialect,
		mocks,
	};
}
