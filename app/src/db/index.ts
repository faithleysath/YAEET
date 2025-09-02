import { Elysia } from "elysia"
import * as schema from "./schema"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { Database } from "bun:sqlite";

const sqlite = new Database('mydb.sqlite', { create: true });
const db = drizzle(sqlite, { schema });
await migrate(db, {migrationsFolder: './drizzle'});

export const DB = new Elysia({name: "db"}).decorate("db", db);
