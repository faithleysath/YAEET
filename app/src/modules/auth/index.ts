import { Elysia } from 'elysia'

export const auth = new Elysia({ prefix: '/auth' })
	.get(
		'/sign-in',
		async ({ body, cookie: { session } }) => {

		}, {

		}
	)
