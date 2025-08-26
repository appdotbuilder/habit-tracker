import { serial, text, pgTable, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for habit types and frequencies
export const habitTypeEnum = pgEnum('habit_type', ['daily', 'long-term']);
export const frequencyEnum = pgEnum('frequency', ['daily', 'weekly', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

// Habits table
export const habitsTable = pgTable('habits', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  type: habitTypeEnum('type').notNull(),
  frequency: frequencyEnum('frequency').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Habit completions table for tracking when habits were completed
export const habitCompletionsTable = pgTable('habit_completions', {
  id: serial('id').primaryKey(),
  habit_id: serial('habit_id').notNull().references(() => habitsTable.id, { onDelete: 'cascade' }),
  completed_date: timestamp('completed_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const habitsRelations = relations(habitsTable, ({ many }) => ({
  completions: many(habitCompletionsTable),
}));

export const habitCompletionsRelations = relations(habitCompletionsTable, ({ one }) => ({
  habit: one(habitsTable, {
    fields: [habitCompletionsTable.habit_id],
    references: [habitsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Habit = typeof habitsTable.$inferSelect; // For SELECT operations
export type NewHabit = typeof habitsTable.$inferInsert; // For INSERT operations

export type HabitCompletion = typeof habitCompletionsTable.$inferSelect;
export type NewHabitCompletion = typeof habitCompletionsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  habits: habitsTable, 
  habitCompletions: habitCompletionsTable 
};

export const tableRelations = {
  habitsRelations,
  habitCompletionsRelations
};