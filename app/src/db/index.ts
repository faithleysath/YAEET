import { Elysia } from "elysia"

import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
const db = drizzle('mydb.sqlite');
await migrate(db, {migrationsFolder: './drizzle'});

export const DB = new Elysia().decorate("db", db);