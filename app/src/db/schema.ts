import { relations } from 'drizzle-orm';
import * as t from "drizzle-orm/sqlite-core"

const timestamps = {
    createdAt: t.int('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: t.int('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
    deletedAt: t.int('deleted_at', { mode: 'timestamp_ms' }),
};

const baseColumns = {
    id: t.int().primaryKey({ autoIncrement: true }),
    ...timestamps
};

export const users = t.sqliteTable("users", {
    ...baseColumns,
    role: t.text({enum: ['student', 'teacher', 'admin']}).notNull(),
    username: t.text().notNull().unique(),
    passwordHash: t.text('password_hash').notNull(),
    realName: t.text('real_name').notNull(),
    lastLogin: t.int('last_login', {mode: 'timestamp_ms'}),
    lastLoginIp: t.text('last_login_ip'),
});

export const courses = t.sqliteTable("courses", {
    ...baseColumns,
    name: t.text().notNull(),
    teacherId: t.int('teacher_id').notNull().references(() => users.id),
});

export const usersToCourses = t.sqliteTable("users_to_courses", { // 学生选课表
    userId: t.int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    courseId: t.int('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
    ...timestamps
}, (table) => [
    t.primaryKey({ columns: [table.userId, table.courseId] })
]);

export type ChoiceQuestionData = {
    options: {
        id: number;
        content: string;
        explanation?: string;
    }[];
    answer: number[] | number; // 单选为单个数字，多选为数字数组
};

export type TrueFalseQuestionData = {
    answer: boolean;
};

export type FillInTheBlankQuestionData = {
    answer: string[]; // 答案可以是多个填空
};

export type EssayQuestionData = {
    answer: string;
};

export type ProgramJudgeQuestionData = {
    answer: string;
    language: 'python' | 'javascript';
    input: string;
    output: string;
};

export type QuestionData = ChoiceQuestionData | TrueFalseQuestionData | FillInTheBlankQuestionData | EssayQuestionData | ProgramJudgeQuestionData;

export const questions = t.sqliteTable("questions", {
    ...baseColumns,
    globalId: t.text('global_id'), // 在线题库id，允许为空，表示本地题目
    globalAuthorId: t.text('global_author_id'), // 在线题库作者id，允许为空，表示本地题目
    authorId: t.int('author_id').notNull().references(() => users.id),
    forkFrom: t.int('fork_from'),
    content: t.text().notNull(),
    type: t.text({enum: ['single-choice', 'multiple-choice', 'true-false', 'fill-in-the-blank', 'essay', 'program-judge']}).notNull(),
    data: t.text({mode: 'json'}).$type<QuestionData>().notNull(), // 题目数据，JSON 格式
    explanation: t.text(), // 题目解析
    difficulty: t.int().notNull().default(1), // 题目难度，1-5
    tags: t.text({mode: 'json'}).$type<string[]>().default([]),
}, (table) => [
    t.foreignKey({
        columns: [table.forkFrom],
        foreignColumns: [table.id],
    }).onDelete("set null"),
]);

export const questionsCollections = t.sqliteTable("questions_collections", { // 可以是老师用来管理题目的集合，也可以是学生用来收藏题目的集合，或错题本
    ...baseColumns,
    userId: t.int('user_id').notNull().references(() => users.id),
    name: t.text().notNull(),
    description: t.text(),
    tags: t.text({mode: 'json'}).$type<string[]>().default([]),
});

export const questionsToCollections = t.sqliteTable("questions_to_collections", {
    questionId: t.int('question_id').notNull().references(() => questions.id),
    collectionId: t.int('collection_id').notNull().references(() => questionsCollections.id),
    score: t.int().default(1).$default(() => 1),
    orderIndex: t.int('order_index'),
    ...timestamps
}, (table) => [
    t.primaryKey({ columns: [table.questionId, table.collectionId] })
]);

export const examExercises = t.sqliteTable("exam_exercises", {
    ...baseColumns,
    userId: t.int('user_id').notNull().references(() => users.id),
    courseId: t.int('course_id').notNull().references(() => courses.id),
    collectionId: t.int('collection_id').notNull().references(() => questionsCollections.id),
    type: t.text({enum: ['practice', 'exam']}).notNull(),
    title: t.text().notNull(),
    description: t.text().notNull(),
    tags: t.text({mode: 'json'}).$type<string[]>().default([]),
    sortMode: t.text('sort_mode', {enum: ['fixed', 'random']}).notNull().default('fixed'),
    optionSortMode: t.text('option_sort_mode', {enum: ['fixed', 'random']}).notNull().default('fixed'),
    questionOrder: t.text('question_order', {mode: 'json'}).$type<number[]>().default([]),
    questionNum: t.int('question_num').notNull().default(1),
    startTime: t.int('start_time', { mode: 'timestamp_ms' }).notNull(),
    endTime: t.int('end_time', { mode: 'timestamp_ms' }).notNull(),
    duration: t.int().notNull().default(0), // 持续时间，单位分钟，0表示不限时
    minDuration: t.int('min_duration').notNull().default(0), // 最小持续时间，单位分钟
    allowRetryNum: t.int('allow_retry_num').notNull().default(0), // 允许重试次数
    passingScore: t.int('passing_score').notNull().default(60), // 及格分数
});

export const examExerciseSubmissions = t.sqliteTable("exam_exercise_submissions", {
    ...baseColumns,
    userId: t.int('user_id').notNull().references(() => users.id),
    exerciseId: t.int('exercise_id').notNull().references(() => examExercises.id),
    score: t.int().default(0),
    isPassed: t.int('is_passed', {mode: 'boolean'}).notNull().default(false),
});

export const answerSubmissions = t.sqliteTable("answer_submissions", {
    ...baseColumns,
    userId: t.int('user_id').notNull().references(() => users.id),
    submissionId: t.int('submission_id').notNull().references(() => examExerciseSubmissions.id),
    questionId: t.int('question_id').notNull().references(() => questions.id),
    answer: t.text({ mode: 'json' }).$type<QuestionData['answer']>().notNull(),
    isCorrect: t.int('is_correct', {mode: 'boolean'}),
    score: t.int(),
});

export const usersRelations = relations(users, ({ many }) => ({
    usersToCourses: many(usersToCourses), // 学生上的课程
    teachingCourses: many(courses), // 教师教授的课程
    authorQuestions: many(questions), // 教师出过的题目
    questionCollections: many(questionsCollections), // 拥有的题目集
    authoredExams: many(examExercises), // 教师出过的考试
}));

export const coursesRelations = relations(courses, ({ many, one }) => ({
    usersToCourses: many(usersToCourses), // 选课的学生
    teacher: one(users, { // 教师
        fields: [courses.teacherId],
        references: [users.id]
    }),
    exams: many(examExercises), // 课程下的考试
}));

export const usersToCoursesRelations = relations(usersToCourses, ({ one }) => ({
    user: one(users, { // 学生
        fields: [usersToCourses.userId],
        references: [users.id]
    }),
    course: one(courses, { // 课程
        fields: [usersToCourses.courseId],
        references: [courses.id]
    })
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
    author: one(users, { // 题目作者
        fields: [questions.authorId],
        references: [users.id]
    }),
    forkedQuestions: many(questions), // 被 fork 的题目
    forkingQuestions: one(questions, { // fork 自哪个题目
        fields: [questions.forkFrom],
        references: [questions.id]
    }),
    questionsToCollections: many(questionsToCollections), // 题目所在的集合
}));

export const questionsCollectionsRelations = relations(questionsCollections, ({ one, many }) => ({
    user: one(users, { // 拥有者
        fields: [questionsCollections.userId],
        references: [users.id]
    }),
    questionsToCollections: many(questionsToCollections), // 集合中的题目
    exams: many(examExercises) // 根据该集合创建的考试
}));

export const questionsToCollectionsRelations = relations(questionsToCollections, ({ one }) => ({
    question: one(questions, { // 题目
        fields: [questionsToCollections.questionId],
        references: [questions.id]
    }),
    collection: one(questionsCollections, { // 集合
        fields: [questionsToCollections.collectionId],
        references: [questionsCollections.id]
    })
}));
