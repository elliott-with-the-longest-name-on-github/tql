import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresDialect, init } from './index.js';
import { TqlQuery, TqlFragment, TqlIdentifiers, TqlList, TqlParameter, TqlTemplateString, TqlValues } from './nodes.js';
import { createTestDialect } from './dialects/test.js';
import type { Tql } from './types.js';
import { createQueryBuilder } from './utils.js';

describe('exports', () => {
	const { Dialect, mocks } = createTestDialect();
	let query: Tql['query'];
	let fragment: Tql['fragment'];
	let identifiers: Tql['identifiers'];
	let list: Tql['list'];
	let values: Tql['values'];
	let unsafe: Tql['unsafe'];

	beforeEach(() => {
		vi.restoreAllMocks();
		({ query, fragment, identifiers, list, values, unsafe } = init({
			dialect: Dialect,
		}));
	});

	// This suite should really just verify that `query` is adhering to the contract it has with Dialect
	// i.e. that it's calling the correct dialect methods with the correct data given a certain input.
	describe('query and fragment', () => {
		it('only calls the dialect `templateString` method for a simple query', () => {
			query`SELECT * FROM users`;
			expect(mocks.preprocess).toHaveBeenCalledOnce();
			expect(mocks.preprocess).toHaveBeenCalledWith(new TqlQuery([new TqlTemplateString('SELECT * FROM users')]));
			expect(mocks.templateString).toHaveBeenCalledOnce();
			expect(mocks.templateString).toHaveBeenCalledWith(new TqlTemplateString('SELECT * FROM users'));
			expect(mocks.parameter).not.toHaveBeenCalled();
			expect(mocks.identifiers).not.toHaveBeenCalled();
			expect(mocks.list).not.toHaveBeenCalled();
			expect(mocks.values).not.toHaveBeenCalled();
			expect(mocks.postprocess).toHaveBeenCalledOnce();
			expect(mocks.postprocess).toHaveBeenCalledWith('', []);
		});

		it('allows arrays as values', () => {
			const filters = [fragment`AND user_id = ${1234}`, fragment`AND user_name = ${'retelliott'}`, 1234];
			query`SELECT * FROM users WHERE 1=1 ${filters}`;
			expect(mocks.preprocess).toHaveBeenCalledOnce();
			expect(mocks.preprocess).toHaveBeenCalledWith(
				new TqlQuery([
					new TqlTemplateString('SELECT * FROM users WHERE 1=1 '),
					new TqlFragment([new TqlTemplateString('AND user_id = '), new TqlParameter(1234), new TqlTemplateString('')]),
					new TqlFragment([
						new TqlTemplateString('AND user_name = '),
						new TqlParameter('retelliott'),
						new TqlTemplateString(''),
					]),
					new TqlParameter(1234),
					new TqlTemplateString(''),
				]),
			);
			expect(mocks.templateString).toHaveBeenCalledTimes(6);
			expect(mocks.templateString).toHaveBeenNthCalledWith(1, new TqlTemplateString('SELECT * FROM users WHERE 1=1 '));
			expect(mocks.templateString).toHaveBeenNthCalledWith(2, new TqlTemplateString('AND user_id = '));
			expect(mocks.templateString).toHaveBeenNthCalledWith(3, new TqlTemplateString(''));
			expect(mocks.templateString).toHaveBeenNthCalledWith(4, new TqlTemplateString('AND user_name = '));
			expect(mocks.templateString).toHaveBeenNthCalledWith(5, new TqlTemplateString(''));
			expect(mocks.templateString).toHaveBeenNthCalledWith(6, new TqlTemplateString(''));
			expect(mocks.parameter).toHaveBeenCalledTimes(3);
			expect(mocks.parameter).toHaveBeenNthCalledWith(1, new TqlParameter(1234));
			expect(mocks.parameter).toHaveBeenNthCalledWith(2, new TqlParameter('retelliott'));
			expect(mocks.parameter).toHaveBeenNthCalledWith(3, new TqlParameter(1234));
			expect(mocks.identifiers).not.toHaveBeenCalled();
			expect(mocks.list).not.toHaveBeenCalled();
			expect(mocks.values).not.toHaveBeenCalled();
			expect(mocks.postprocess).toHaveBeenCalledOnce();
			expect(mocks.postprocess).toHaveBeenCalledWith('', []);
		});

		it('works recursively', () => {
			query`SELECT * FROM (${fragment`SELECT * FROM users WHERE user_id = ${1234}`});`;
			expect(mocks.preprocess).toHaveBeenCalledOnce();
			expect(mocks.preprocess).toHaveBeenCalledWith(
				new TqlQuery([
					new TqlTemplateString('SELECT * FROM ('),
					new TqlFragment([
						new TqlTemplateString('SELECT * FROM users WHERE user_id = '),
						new TqlParameter(1234),
						new TqlTemplateString(''),
					]),
					new TqlTemplateString(');'),
				]),
			);
			expect(mocks.templateString).toHaveBeenCalledTimes(4);
			expect(mocks.templateString).toHaveBeenNthCalledWith(1, new TqlTemplateString('SELECT * FROM ('));
			expect(mocks.templateString).toHaveBeenNthCalledWith(
				2,
				new TqlTemplateString('SELECT * FROM users WHERE user_id = '),
			);
			expect(mocks.templateString).toHaveBeenNthCalledWith(3, new TqlTemplateString(''));
			expect(mocks.templateString).toHaveBeenNthCalledWith(4, new TqlTemplateString(');'));
			expect(mocks.parameter).toHaveBeenCalledOnce();
			expect(mocks.parameter).toHaveBeenCalledWith(new TqlParameter(1234));
			expect(mocks.identifiers).not.toHaveBeenCalled();
			expect(mocks.list).not.toHaveBeenCalled();
			expect(mocks.values).not.toHaveBeenCalled();
			expect(mocks.postprocess).toHaveBeenCalledOnce();
			expect(mocks.postprocess).toHaveBeenCalledWith('', []);
		});
	});

	describe('identifiers', () => {
		it('creates an identifiers object', () => {
			const result = identifiers(['column_name_1', 'column_name_2']);
			expect(result).toBeInstanceOf(TqlIdentifiers);
			expect(result.values).toEqual(['column_name_1', 'column_name_2']);
		});
	});

	describe('list', () => {
		it('creates a list object', () => {
			const result = list(['column_name_1', 'column_name_2']);
			expect(result).toBeInstanceOf(TqlList);
			expect(result.values).toEqual(['column_name_1', 'column_name_2']);
		});
	});

	describe('values', () => {
		it('creates a values object given a single object', () => {
			const value = { one: 1, two: 2, three: { number: 3 } };
			const result = values(value);
			expect(result).toBeInstanceOf(TqlValues);
			expect(result.values).toEqual(value);
		});

		it('creates a values object given an array of objects', () => {
			const value = [
				{ one: 1, two: 2, three: { number: 3 } },
				{ one: 1, two: 2, three: { number: 3 } },
			];
			const result = values(value);
			expect(result).toBeInstanceOf(TqlValues);
			expect(result.values).toEqual(value);
		});
	});

	describe('unsafe', () => {
		it('creates a TqlTemplateString object', () => {
			const result = unsafe(`SELECT * FROM users WHERE id = ${1234}`);
			expect(result).toBeInstanceOf(TqlTemplateString);
			expect(result.value).toEqual('SELECT * FROM users WHERE id = 1234');
		});
	});
});

describe('integration', () => {
	describe('postgres', () => {
		let query: Tql['query'];
		let fragment: Tql['fragment'];
		let identifiers: Tql['identifiers'];
		let list: Tql['list'];
		let values: Tql['values'];

		beforeEach(() => {
			const qb = createQueryBuilder();
			qb.appendToParams = vi.fn().mockImplementation(qb.appendToParams);
			qb.appendToQuery = vi.fn().mockImplementation(qb.appendToQuery);
			({ query, fragment, identifiers, list, values } = init({
				dialect: PostgresDialect,
			}));
		});

		it('produces a correct SELECT query', () => {
			const [q, params] = query`
        SELECT * FROM users WHERE user_id = ${1234};
      `;
			expect(q).toBe('\n        SELECT * FROM users WHERE user_id = $1;\n      ');
			expect(params).toEqual([1234]);
		});

		it('produces a correct INSERT query', () => {
			const [q, params] = query`
        INSERT INTO users ${values({ name: 'vercelliott' })};
      `;
			expect(q).toBe('\n        INSERT INTO users ("name") VALUES ($1);\n      ');
			expect(params).toEqual(['vercelliott']);
		});

		it('produces a correct query with a list', () => {
			const [q, params] = query`
        SELECT * FROM users WHERE user_id IN ${list([1, 2, 3, 4])};
      `;
			expect(q).toBe('\n        SELECT * FROM users WHERE user_id IN ($1, $2, $3, $4);\n      ');
			expect(params).toEqual([1, 2, 3, 4]);
		});

		it('produces a correct query with dynamic identifiers', () => {
			const [q, params] = query`
        SELECT ${identifiers('name')}, ${identifiers([
				'email',
				'birthdate',
				'gender',
			])} FROM users WHERE user_id = ${1234};
      `;
			expect(q).toBe('\n        SELECT "name", "email", "birthdate", "gender" FROM users WHERE user_id = $1;\n      ');
			expect(params).toEqual([1234]);
		});

		it('works with recursive queries, example from jsdoc', () => {
			const familyName = 'Smith';
			const familyFragment = fragment`SELECT * FROM users WHERE family_name = ${familyName}`;
			const [jobsHeldByFamilyMembersQuery, params] = query`
        WITH family AS (${familyFragment})
        SELECT * FROM jobs INNER JOIN family ON jobs.user_id = family.user_id;
      `;
			expect(jobsHeldByFamilyMembersQuery).toBe(`
        WITH family AS (SELECT * FROM users WHERE family_name = $1)
        SELECT * FROM jobs INNER JOIN family ON jobs.user_id = family.user_id;
      `);
			expect(params).toEqual(['Smith']);
		});

		it('correctly parameterizes complex queries', () => {
			const insertClause = fragment`INSERT INTO users ${values({ name: 'vercelliott' })}`;
			const updateClause = fragment`UPDATE users SET name = ${'reselliott'} WHERE name = ${'vercelliott'}`;
			const selectClause = fragment`SELECT * FROM users WHERE name = ${'reselliott'}`;
			const [q, params] = query`
        ${insertClause};
        ${updateClause};
        ${selectClause};
      `;
			expect(q).toBe(`
        INSERT INTO users ("name") VALUES ($1);
        UPDATE users SET name = $2 WHERE name = $3;
        SELECT * FROM users WHERE name = $4;
      `);
			expect(params).toEqual(['vercelliott', 'reselliott', 'vercelliott', 'reselliott']);
		});
	});
});
