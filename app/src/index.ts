import { Elysia } from "elysia";
import { DB } from "@/db/index.js";
import { auth } from "@/modules/auth/index.js";

const app = new Elysia()
        .use(DB)
        .use(auth)
        .get("/", () => "Hello Elysia")
        .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
