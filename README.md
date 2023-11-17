# What is it?

```sh
pnpm i @sejohnson/tql
```

TQL (Template-SQL -- unfortunately, T-SQL is already taken!) is a lightweight library for writing SQL in TypeScript:

```ts
import { init, PostgresDialect } from '@sejohnson/tql';

const { 
  query,
  fragment,
  identifier,
  identifiers,
  list,
  values,
  set,
  unsafe
} = init({ dialect: PostgresDialect });

const [q, params] = query`SELECT * FROM users`;
// output: ['SELECT * FROM users', []]
```

Its API is simple -- everything starts and ends with `query`, which returns a tuple of the compiled query string and parameters to pass to your database.

### API

To start, you'll need to initialize the query compiler:

```ts
import { init, PostgresDialect } from '@sejohnson/tql';

const tql = init({ dialect: PostgresDialect });
```

Missing your dialect? Feel free to open a PR -- they're pretty easy to write!

Below, you can see the utilities returned from `init`:

#### Parameters

Anything directly passed into a template becomes a parameter. Essentially, the "holes" in the template are filled in with the dialect's parameter placeholder, and the value itself is passed directly into the parameters array:

```ts
const userId = 1234;
const [q, params] = query`SELECT * FROM users WHERE user_id = ${userId}`;
// output: ['SELECT * FROM users WHERE user_id = $1', [1234]]
```

#### List parameters

Need to use list syntax?:

```ts
const userId = [1234, 5678];
const [q, params] = query`SELECT * FROM users WHERE user_id IN ${list(userId)}`;
// output: ['SELECT * FROM users WHERE user_id IN ($1, $2)', [1234, 5678]]
```

#### Composable queries

Need to share clauses between queries, or do you just find it more convenient to build a specific query in multiple variable declarations? `fragment` is what you're looking for!

```ts
const userId = 1234;
const whereClause = fragment`WHERE user_id = ${userId}`;
const [q, params] = query`SELECT * FROM users ${whereClause}`;
// output: ['SELECT * FROM users WHERE user_id = $1', [1234]]
```

Fragments can be nested recursively, so the possibilities are endless.

#### Identifiers

Need to dynamically insert identifiers?

```ts
const columns = ['name', 'dob'];
const [q, params] = query`SELECT ${identifiers(columns)} FROM users`;
// output: ['SELECT "name", "dob" FROM users', []]

There's also a singular `identifier` for convenience (i.e. for table names). Identifiers are automatically quote-escaped -- `users.name` becomes `"users"."name"`.
```

#### VALUES clauses

Inserting records is a pain!

```ts
const users = [
  { name: 'vercelliott', favorite_hobby: 'screaming into the void' },
  { name: 'reselliott', favorite_hobby: 'thrifting' },
];
const [q, params] = query`INSERT INTO users ${values(users)}`;
// output: [
//   'INSERT INTO users ("name", "favorite_hobby") VALUES ($1, $2), ($3, $4)',
//   ['vercelliott', 'screaming into the void', 'reselliott', 'thrifting']
//  ]
```

`values` also accepts just one record instead of an array. If an array is passed, it will validate that all records have the same columns.

#### SET clauses

Updating records can also be a pain!

```ts
const updatedUser = { name: 'vercelliott' };
const userId = 1234;
const [q, params] = query`UPDATE users ${set(updatedUser)} WHERE userId = ${userId}`;
// output: ['UPDATE users SET "name" = $1 WHERE userId = $2', ['vercelliott', 1234]]
```

#### `unsafe`

This is just a tagged template that will be verbatim-inserted into your query. It _is_ unsafe, do _not_ pass unsanitized user input into it!

### I want to...

As people ask questions about how to do various things, I'll fill out this section as a sort of FAQ.
