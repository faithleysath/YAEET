import { relations } from 'drizzle-orm';
import * as t from "drizzle-orm/sqlite-core"

// =============================================
// Common Columns & Base Schema
// =============================================

const timestamps = {
    createdAt: t.int('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: t.int('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
    deletedAt: t.int('deleted_at', { mode: 'timestamp_ms' }),
};

const baseColumns = {
    id: t.int('id').primaryKey({ autoIncrement: true }),
    ...timestamps
};

// =============================================
// Table Definitions
// =============================================

export const users = t.sqliteTable("users", {
    ...baseColumns,
    role: t.text('role', {enum: ['student', 'teacher', 'admin']}).notNull(),
    username: t.text('username').notNull().unique(),
    passwordHash: t.text('password_hash').notNull(),
    realName: t.text('real_name').notNull(),
    lastLogin: t.int('last_login', {mode: 'timestamp_ms'}),
    lastLoginIp: t.text('last_login_ip'),
});

export const courses = t.sqliteTable("courses", {
    ...baseColumns,
    name: t.text('name').notNull(),
    teacherId: t.int('teacher_id').notNull().references(() => users.id),
});

// Junction table for students enrolled in courses
export const usersToCourses = t.sqliteTable("users_to_courses", {
    userId: t.int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    courseId: t.int('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
    ...timestamps
}, (table) => ([
    t.primaryKey({ columns: [table.userId, table.courseId] })
]));


// --- Question Related Tables ---

export type ChoiceQuestionData = {
    options: {
        id: number;
        content: string;
        explanation?: string;
    }[];
    answer: number[] | number; // Single number for single choice, array for multiple choice
};

export type TrueFalseQuestionData = {
    answer: boolean;
};

export type FillInTheBlankQuestionData = {
    answer: string[]; // Can have multiple blanks
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
    globalId: t.text('global_id'), // Optional ID from an online question bank
    globalAuthorId: t.text('global_author_id'), // Optional author ID from an online bank
    authorId: t.int('author_id').notNull().references(() => users.id),
    forkFrom: t.int('fork_from'),
    content: t.text('content').notNull(),
    type: t.text('type', {enum: ['single-choice', 'multiple-choice', 'true-false', 'fill-in-the-blank', 'essay', 'program-judge']}).notNull(),
    data: t.text('data', {mode: 'json'}).$type<QuestionData>().notNull(),
    explanation: t.text('explanation'),
    difficulty: t.int('difficulty').notNull().default(1), // Difficulty from 1-5
    tags: t.text('tags', {mode: 'json'}).$type<string[]>().default([]),
}, (table) => ([
    t.foreignKey({
        columns: [table.forkFrom],
        foreignColumns: [table.id],
    }).onDelete("set null")
]));

// A collection of questions (e.g., for a quiz, study guide, or student's saved questions)
export const questionsCollections = t.sqliteTable("questions_collections", {
    ...baseColumns,
    userId: t.int('user_id').notNull().references(() => users.id),
    name: t.text('name').notNull(),
    description: t.text('description'),
    tags: t.text('tags', {mode: 'json'}).$type<string[]>().default([]),
});

// Junction table for questions within collections
export const questionsToCollections = t.sqliteTable("questions_to_collections", {
    questionId: t.int('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
    collectionId: t.int('collection_id').notNull().references(() => questionsCollections.id, { onDelete: 'cascade' }),
    score: t.int('score').default(1).notNull(),
    orderIndex: t.int('order_index'),
    ...timestamps
}, (table) => ([
    t.primaryKey({ columns: [table.questionId, table.collectionId] })
]));


// --- Exam & Submission Related Tables ---

export const examExercises = t.sqliteTable("exam_exercises", {
    ...baseColumns,
    userId: t.int('user_id').notNull().references(() => users.id), // The author (teacher)
    courseId: t.int('course_id').notNull().references(() => courses.id),
    collectionId: t.int('collection_id').notNull().references(() => questionsCollections.id),
    type: t.text('type', {enum: ['practice', 'exam']}).notNull(),
    title: t.text('title').notNull(),
    description: t.text('description').notNull(),
    tags: t.text('tags', {mode: 'json'}).$type<string[]>().default([]),
    sortMode: t.text('sort_mode', {enum: ['fixed', 'random']}).notNull().default('fixed'),
    optionSortMode: t.text('option_sort_mode', {enum: ['fixed', 'random']}).notNull().default('fixed'),
    questionOrder: t.text('question_order', {mode: 'json'}).$type<number[]>().default([]),
    questionNum: t.int('question_num').notNull().default(1),
    startTime: t.int('start_time', { mode: 'timestamp_ms' }).notNull(),
    endTime: t.int('end_time', { mode: 'timestamp_ms' }).notNull(),
    duration: t.int('duration').notNull().default(0), // Duration in minutes, 0 for unlimited
    minDuration: t.int('min_duration').notNull().default(0), // Minimum duration in minutes
    allowRetryNum: t.int('allow_retry_num').notNull().default(0),
    passingScore: t.int('passing_score').notNull().default(60),
});

export const examExerciseSubmissions = t.sqliteTable("exam_exercise_submissions", {
    ...baseColumns,
    userId: t.int('user_id').notNull().references(() => users.id),
    exerciseId: t.int('exercise_id').notNull().references(() => examExercises.id, { onDelete: 'cascade' }),
    score: t.int('score').default(0),
    isPassed: t.int('is_passed', {mode: 'boolean'}).notNull().default(false),
});

export const answerSubmissions = t.sqliteTable("answer_submissions", {
    ...baseColumns,
    userId: t.int('user_id').notNull().references(() => users.id),
    submissionId: t.int('submission_id').notNull().references(() => examExerciseSubmissions.id, { onDelete: 'cascade' }),
    questionId: t.int('question_id').notNull().references(() => questions.id),
    answer: t.text('answer', { mode: 'json' }).$type<QuestionData['answer']>().notNull(),
    isCorrect: t.int('is_correct', {mode: 'boolean'}),
    score: t.int('score'),
});


// =============================================
// Relation Definitions
// =============================================

export const usersRelations = relations(users, ({ many }) => ({
    // A user can be enrolled in many courses (as a student)
    usersToCourses: many(usersToCourses),
    // A user can teach many courses (as a teacher)
    teachingCourses: many(courses),
    // A user can author many questions
    authorQuestions: many(questions),
    // A user can own many question collections
    questionCollections: many(questionsCollections),
    // A user can author many exams
    authoredExams: many(examExercises),
    // A user can have many exam submissions
    examSubmissions: many(examExerciseSubmissions),
    // A user can submit many individual answers
    answerSubmissions: many(answerSubmissions),
}));

export const coursesRelations = relations(courses, ({ many, one }) => ({
    // A course can have many students enrolled
    usersToCourses: many(usersToCourses),
    // A course has one teacher
    teacher: one(users, {
        fields: [courses.teacherId],
        references: [users.id]
    }),
    // A course can have many exams
    exams: many(examExercises),
}));

export const usersToCoursesRelations = relations(usersToCourses, ({ one }) => ({
    // The user (student) in the enrollment record
    user: one(users, {
        fields: [usersToCourses.userId],
        references: [users.id]
    }),
    // The course in the enrollment record
    course: one(courses, {
        fields: [usersToCourses.courseId],
        references: [courses.id]
    })
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
    // A question has one author
    author: one(users, {
        fields: [questions.authorId],
        references: [users.id]
    }),
    // A question can be forked by many other questions
    forkedQuestions: many(questions, { relationName: 'forked' }),
    // A question can be a fork of one other question
    forkingQuestion: one(questions, {
        fields: [questions.forkFrom],
        references: [questions.id],
        relationName: 'forked'
    }),
    // A question can belong to many collections
    questionsToCollections: many(questionsToCollections),
}));

export const questionsCollectionsRelations = relations(questionsCollections, ({ one, many }) => ({
    // A collection has one owner/user
    user: one(users, {
        fields: [questionsCollections.userId],
        references: [users.id]
    }),
    // A collection contains many questions
    questionsToCollections: many(questionsToCollections),
    // An exam can be created from this collection
    exams: many(examExercises)
}));

export const questionsToCollectionsRelations = relations(questionsToCollections, ({ one }) => ({
    // The question in the collection
    question: one(questions, {
        fields: [questionsToCollections.questionId],
        references: [questions.id]
    }),
    // The collection the question belongs to
    collection: one(questionsCollections, {
        fields: [questionsToCollections.collectionId],
        references: [questionsCollections.id]
    })
}));

export const examExercisesRelations = relations(examExercises, ({ one, many }) => ({
    // The exam has one author (teacher)
    author: one(users, {
        fields: [examExercises.userId],
        references: [users.id]
    }),
    // The exam belongs to one course
    course: one(courses, {
        fields: [examExercises.courseId],
        references: [courses.id]
    }),
    // The exam is based on one question collection
    collection: one(questionsCollections, {
        fields: [examExercises.collectionId],
        references: [questionsCollections.id]
    }),
    // The exam can have many student submissions
    submissions: many(examExerciseSubmissions),
}));

export const examExerciseSubmissionsRelations = relations(examExerciseSubmissions, ({ one, many }) => ({
    // The submission belongs to one user (student)
    user: one(users, {
        fields: [examExerciseSubmissions.userId],
        references: [users.id]
    }),
    // The submission is for one specific exam/exercise
    exercise: one(examExercises, {
        fields: [examExerciseSubmissions.exerciseId],
        references: [examExercises.id]
    }),
    // A submission contains many individual answers
    answers: many(answerSubmissions),
}));

export const answerSubmissionsRelations = relations(answerSubmissions, ({ one }) => ({
    // The answer was submitted by one user (student)
    user: one(users, {
        fields: [answerSubmissions.userId],
        references: [users.id]
    }),
    // The answer is part of a larger exam submission
    submission: one(examExerciseSubmissions, {
        fields: [answerSubmissions.submissionId],
        references: [examExerciseSubmissions.id]
    }),
    // The answer is for one specific question
    question: one(questions, {
        fields: [answerSubmissions.questionId],
        references: [questions.id]
    })
}));

