import { Elysia, t } from "elysia"
import { db } from "@/db/model"

// 从 db.select.users 模型中挑选需要的字段来动态创建 UserInfo 类型
// 这样就移除了 passwordHash 等敏感字段，并与数据库 schema 保持同步
const UserInfo = t.Pick(t.Object(db.select.users), [
    'id',
    'username',
    'role',
    'realName',
    'lastLogin',
    'lastLoginIp'
])

export const authState = new Elysia({ name: "auth.state" })
    .model({
        'user.info': UserInfo,
        'auth.register': t.Object({
            username: t.String({ minLength: 2, error: "用户名长度至少为2" }),
            password: t.String({ minLength: 8, error: "密码长度至少为8" }),
            realName: t.String({ minLength: 2, error: "真实姓名长度至少为2" }),
            role: t.Enum({
                student: 'student',
                teacher: 'teacher',
                admin: 'admin'
            }, { error: "无效的角色" })
        }),
        'auth.login': t.Object({
            username: t.String(),
            password: t.String()
        }),
        'auth.cookie': t.Cookie({
            authToken: t.Optional(t.String())
        })
    })
    .state({
        // 使用上面动态生成的类型
        userInfo: {} as Record<number, typeof UserInfo.static>,
        session: {} as Record<string, number> // session token -> user id
    })
    .macro({
        checkAuth: {
            cookie: 'auth.cookie',
            beforeHandle({ cookie: { authToken }, store: { session }, status }) {
                if (!authToken.value || !session[authToken.value]) {
                    return status(401, 'Unauthorized')
                }
            }
        },
        isAuth: {
            cookie: 'auth.cookie',
            beforeHandle({ cookie: { authToken }, store: { session }, status }) {
                if (!authToken.value || !session[authToken.value]) {
                    return status(401, 'Unauthorized')
                }
            },
            resolve({ cookie: { authToken }, store: { session, userInfo } }) {
                const tokenValue = authToken.value
                if (!tokenValue) {
                    return { user: undefined }
                }

                const userId = session[tokenValue]
                if (!userId) {
                    return { user: undefined }
                }

                const user = userInfo[userId]
                return {
                    user
                }
            }
        }
    })
