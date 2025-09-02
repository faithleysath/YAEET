import { Elysia } from 'elysia'
import { authState } from './state'
import { DB } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const auth = new Elysia({ prefix: '/auth' })
		.use(DB)
		.use(authState)
		.post('/register', async ({ db, body, status }) => {
			const existingUser = await db.query.users.findFirst({
				where: eq(users.username, body.username)
			});

			if (existingUser) {
				return status(409, {
					success: false,
					message: '用户名已存在'
				});
			}

			const passwordHash = await Bun.password.hash(body.password);

			await db.insert(users).values({
				username: body.username,
				passwordHash,
				realName: body.realName,
				role: body.role
			});

			return {
				success: true,
				message: '注册成功'
			}
		}, {
			body: 'auth.register'
		})
		.post('/login', async ({ db, body, store, cookie, status }) => {
			const user = await db.query.users.findFirst({
				where: eq(users.username, body.username)
			});

			if (!user) {
				return status(401, {
					success: false,
					message: '用户名或密码错误'
				});
			}

			const isMatch = await Bun.password.verify(body.password, user.passwordHash);

			if (!isMatch) {
				return status(401, {
					success: false,
					message: '用户名或密码错误'
				});
			}

			const token = crypto.randomUUID();
			store.session[token] = user.id;
			
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { passwordHash, ...userInfo } = user;
			store.userInfo[user.id] = userInfo;

			cookie.authToken.set({
				value: token,
				httpOnly: true,
				maxAge: 7 * 86400, // 7 days
				path: '/',
			});

			return {
				success: true,
				message: '登录成功',
				data: userInfo
			}
		}, {
			body: 'auth.login',
			cookie: 'auth.cookie'
		})
		.get('/me', ({ user }) => {
			return {
				success: true,
				data: user
			}
		}, {
			isAuth: true,
		})
		.post('/logout', ({ cookie: { authToken }, store: { session } }) => {
			if (authToken.value) {
				delete session[authToken.value]
			}
			authToken.remove()

			return {
				success: true,
				message: '登出成功'
			}
		}, {
			checkAuth: true
		})
