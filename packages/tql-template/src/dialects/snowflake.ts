import type { DialectImpl } from '../types.js';
import { PostgresLike } from '../dialect.js';

export class SnowflakeDialect extends PostgresLike implements DialectImpl {
	protected parameterPrefix = ':';
}
