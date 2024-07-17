import { it, describe, expect, beforeEach, vi } from 'vitest';
import { MySQLDialect } from './mysql.js';
import { TqlTemplateString, TqlParameter, TqlIdentifiers, TqlList, TqlValues, TqlSet } from '../nodes.js';
import { createQueryBuilder } from '../utils.js';
import { TqlError } from '../error.js';

describe('tql dialect: MySQL', () => {
	let queryBuilder: ReturnType<typeof createQueryBuilder>;
	let d: () => MySQLDialect;

	beforeEach(() => {
		const qb = createQueryBuilder();
		qb.appendToParams = vi.fn().mockImplementation(qb.appendToParams);
		qb.appendToQuery = vi.fn().mockImplementation(qb.appendToQuery);
		queryBuilder = qb;
		d = (): MySQLDialect => new MySQLDialect(qb.appendToQuery, qb.appendToParams);
	});

	describe('templateString', () => {
		it('appends the string', () => {
			const dialect = d();
			dialect.templateString(new TqlTemplateString('hi'));
			expect(queryBuilder.params).toEqual([]);
			expect(queryBuilder.query).toBe('hi');
		});
	});

	describe('parameter', () => {
		it('appends the parameter', () => {
			const dialect = d();
			const parameterValue = 'vercelliott';
			dialect.parameter(new TqlParameter(parameterValue));
			expect(queryBuilder.params).toEqual([parameterValue]);
			expect(queryBuilder.query).toBe('?');
		});

		it("does not change the type of the parameter value, even if it's exotic", () => {
			const dialect = d();
			const parameterValue = { name: 'dispelliott' };
			dialect.parameter(new TqlParameter(parameterValue));
			expect(queryBuilder.params).toEqual([parameterValue]);
			expect(queryBuilder.query).toBe('?');
		});
	});

	describe('identifiers', () => {
		it('adds a single identifier to the query', () => {
			const dialect = d();
			const identifier = 'name';
			dialect.identifiers(new TqlIdentifiers(identifier));
			expect(queryBuilder.params).toEqual([]);
			expect(queryBuilder.query).toBe('`name`');
		});

		it.each([
			{ input: 'with"quotes', output: '`with"quotes`' },
			{
				input: 'dotted.identifiers',
				output: '`dottedidentifiers`',
			},
			{
				input: 'with.injection" FROM users; SELECT * FROM privileged_information;--',
				output: '`withinjection" FROM users; SELECT * FROM privileged_information;--`',
			},
		])('escapes identifiers', ({ input, output }) => {
			const dialect = d();
			dialect.identifiers(new TqlIdentifiers(input));
			expect(queryBuilder.params).toEqual([]);
			expect(queryBuilder.query).toBe(output);
		});

		it('adds multiple identifiers to the query', () => {
			const dialect = d();
			const identifier = 'name';
			dialect.identifiers(new TqlIdentifiers([identifier, identifier, identifier]));
			expect(queryBuilder.params).toEqual([]);
			expect(queryBuilder.query).toBe('`name`, `name`, `name`');
		});

		it.each([
			{ input: ['with"quotes', 'with"quotes'], output: '`with"quotes`, `with"quotes`' },
			{
				input: ['dotted.identifiers'],
				output: '`dottedidentifiers`',
			},
			{
				input: ['with.injection" FROM users; SELECT * FROM privileged_information;--', 'blah'],
				output: '`withinjection" FROM users; SELECT * FROM privileged_information;--`, `blah`',
			},
		])('escapes identifiers', ({ input, output }) => {
			const dialect = d();
			dialect.identifiers(new TqlIdentifiers(input));
			expect(queryBuilder.params).toEqual([]);
			expect(queryBuilder.query).toBe(output);
		});
	});

	describe('list', () => {
		it('adds items to a comma-separated list', () => {
			const dialect = d();
			const items = [1, 'hi', { complex: 'type' }];
			dialect.list(new TqlList(items));
			expect(queryBuilder.params).toEqual(items);
			expect(queryBuilder.query).toBe('(?, ?, ?)');
		});
	});

	describe('values', () => {
		describe('single object', () => {
			it('correctly constructs the clause', () => {
				const dialect = d();
				const item = { name: 'vercelliott', email: 'wouldnt.you.like.to.know@vercel.com' };
				dialect.values(new TqlValues(item));
				expect(queryBuilder.params).toEqual([item.name, item.email]);
				expect(queryBuilder.query).toBe('(`name`, `email`) VALUES (?, ?)');
			});

			it('avoids SQL injection from identifiers and values', () => {
				const dialect = d();
				const item = {
					'name"; SELECT * FROM privileged_information; --': 'vercelliott; SELECT * FROM privileged_information; --',
					email: 'wouldnt.you.like.to.know@vercel.com',
				};
				dialect.values(new TqlValues(item));
				expect(queryBuilder.params).toEqual([item['name"; SELECT * FROM privileged_information; --'], item.email]);
				expect(queryBuilder.query).toBe(
					'(`name"; SELECT * FROM privileged_information; --`, `email`) VALUES (?, ?)',
				);
			});

			it('retains complex types', () => {
				const dialect = d();
				const item = {
					name: 'vercelliott',
					email: 'wouldnt.you.like.to.know@vercel.com',
					address: { street: 'go away' },
				};
				dialect.values(new TqlValues(item));
				expect(queryBuilder.params).toEqual([item.name, item.email, item.address]);
				expect(queryBuilder.query).toBe('(`name`, `email`, `address`) VALUES (?, ?, ?)');
			});
		});

		describe('multiple objects', () => {
			it('correctly constructs the clause', () => {
				const dialect = d();
				const items = [
					{ name: 'vercelliott', email: 'wouldnt.you.like.to.know@vercel.com' },
					{ name: 'farewelliott', email: 'go-away@somewhere-else.com' },
				];
				dialect.values(new TqlValues(items));
				expect(queryBuilder.params).toEqual([items[0].name, items[0].email, items[1].name, items[1].email]);
				expect(queryBuilder.query).toBe('(`name`, `email`) VALUES (?, ?), (?, ?)');
			});

			it('correctly constructs the clause when objects have different key orders', () => {
				const dialect = d();
				const items = [
					{ name: 'vercelliott', email: 'wouldnt.you.like.to.know@vercel.com' },
					{ email: 'go-away@somewhere-else.com', name: 'farewelliott' },
				];
				dialect.values(new TqlValues(items));
				expect(queryBuilder.params).toEqual([items[0].name, items[0].email, items[1].name, items[1].email]);
				expect(queryBuilder.query).toBe('(`name`, `email`) VALUES (?, ?), (?, ?)');
			});

			it('avoids SQL injection from identifiers and values', () => {
				const dialect = d();
				const items = [
					{
						'name"; SELECT * FROM privileged_information; --': 'vercelliott; SELECT * FROM privileged_information; --',
						email: 'wouldnt.you.like.to.know@vercel.com',
					},
					{
						email: 'go-away@somewhere-else.com',
						'name"; SELECT * FROM privileged_information; --': 'vercelliott; SELECT * FROM privileged_information; --',
					},
				];
				dialect.values(new TqlValues(items));
				expect(queryBuilder.params).toEqual([
					items[0]['name"; SELECT * FROM privileged_information; --'],
					items[0].email,
					items[1]['name"; SELECT * FROM privileged_information; --'],
					items[1].email,
				]);
				expect(queryBuilder.query).toBe(
					'(`name"; SELECT * FROM privileged_information; --`, `email`) VALUES (?, ?), (?, ?)',
				);
			});

			it('retains complex types', () => {
				const dialect = d();
				const items = [
					{
						name: 'carouselliott',
						email: 'wouldnt.you.like.to.know@vercel.com',
						address: { street: 'go away' },
					},
					{
						name: 'parallelliott',
						email: 'wouldnt.you.like.to.know@vercel.com',
						address: { street: 'go away' },
					},
				];
				dialect.values(new TqlValues(items));
				expect(queryBuilder.params).toEqual([
					items[0].name,
					items[0].email,
					items[0].address,
					items[1].name,
					items[1].email,
					items[1].address,
				]);
				expect(queryBuilder.query).toBe('(`name`, `email`, `address`) VALUES (?, ?, ?), (?, ?, ?)');
			});

			it('throws when subsequent value objects have missing keys', () => {
				const dialect = d();
				const items = [{ name: 'excelliott', email: 'nope@nunya.com' }, { name: 'luddite' }];
				let error: TqlError<'values_records_mismatch'> | null = null;
				try {
					dialect.values(new TqlValues(items));
				} catch (e) {
					error = e;
				}
				expect(error).toBeInstanceOf(TqlError);
				expect(error?.code).toBe('values_records_mismatch');
			});
		});
	});

	describe('set', () => {
		it('correctly constructs the clause', () => {
			const dialect = d();
			const setRecord = { name: 'vercelliott', 'address.zip': '00000' };
			dialect.set(new TqlSet(setRecord));
			expect(queryBuilder.params).toEqual(['vercelliott', '00000']);
			expect(queryBuilder.query).toBe('SET `name` = ?, `addresszip` = ?');
		});

		it('avoids SQL injection from identifiers and values', () => {
			const dialect = d();
			const item = {
				'name"; SELECT * FROM privileged_information; --': 'vercelliott; SELECT * FROM privileged_information; --',
				email: 'wouldnt.you.like.to.know@vercel.com',
			};
			dialect.set(new TqlSet(item));
			expect(queryBuilder.params).toEqual([item['name"; SELECT * FROM privileged_information; --'], item.email]);
			expect(queryBuilder.query).toBe('SET `name"; SELECT * FROM privileged_information; --` = ?, `email` = ?');
		});
	});
});
