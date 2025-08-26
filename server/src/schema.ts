import { z } from 'zod';

// Enum for habit types
export const habitTypeSchema = z.enum(['daily', 'long-term']);
export type HabitType = z.infer<typeof habitTypeSchema>;

// Enum for frequency options
export const frequencySchema = z.enum(['daily', 'weekly', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
export type Frequency = z.infer<typeof frequencySchema>;

// Main habit schema
export const habitSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  type: habitTypeSchema,
  frequency: frequencySchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Habit = z.infer<typeof habitSchema>;

// Habit completion tracking schema
export const habitCompletionSchema = z.object({
  id: z.number(),
  habit_id: z.number(),
  completed_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type HabitCompletion = z.infer<typeof habitCompletionSchema>;

// Progress tracking schema (calculated data)
export const habitProgressSchema = z.object({
  habit_id: z.number(),
  current_streak: z.number().int().nonnegative(),
  longest_streak: z.number().int().nonnegative(),
  last_completed_date: z.coerce.date().nullable(),
  total_completions: z.number().int().nonnegative(),
  completion_rate: z.number().min(0).max(1) // Percentage as decimal (0.0 to 1.0)
});

export type HabitProgress = z.infer<typeof habitProgressSchema>;

// Combined habit with progress data
export const habitWithProgressSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  type: habitTypeSchema,
  frequency: frequencySchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  progress: habitProgressSchema
});

export type HabitWithProgress = z.infer<typeof habitWithProgressSchema>;

// Input schema for creating habits
export const createHabitInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  type: habitTypeSchema,
  frequency: frequencySchema
});

export type CreateHabitInput = z.infer<typeof createHabitInputSchema>;

// Input schema for updating habits
export const updateHabitInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  type: habitTypeSchema.optional(),
  frequency: frequencySchema.optional()
});

export type UpdateHabitInput = z.infer<typeof updateHabitInputSchema>;

// Input schema for marking habit as complete
export const markHabitCompleteInputSchema = z.object({
  habit_id: z.number(),
  completed_date: z.coerce.date().optional() // Defaults to current date if not provided
});

export type MarkHabitCompleteInput = z.infer<typeof markHabitCompleteInputSchema>;

// Input schema for getting habit by ID
export const getHabitByIdInputSchema = z.object({
  id: z.number()
});

export type GetHabitByIdInput = z.infer<typeof getHabitByIdInputSchema>;

// Input schema for deleting habit
export const deleteHabitInputSchema = z.object({
  id: z.number()
});

export type DeleteHabitInput = z.infer<typeof deleteHabitInputSchema>;