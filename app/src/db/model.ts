import { table } from './schema'
import { spreads } from './utils'

export const db = {
	insert: spreads(table, 'insert'),
	select: spreads(table, 'select')
} as const
