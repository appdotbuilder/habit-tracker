import { db } from '../db';
import { habitsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetHabitByIdInput, type Habit } from '../schema';

export async function getHabitById(input: GetHabitByIdInput): Promise<Habit | null> {
  try {
    // Query the database for the specific habit by ID
    const results = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, input.id))
      .execute();

    // Return the first result if found, otherwise null
    if (results.length === 0) {
      return null;
    }

    const habit = results[0];
    return {
      id: habit.id,
      name: habit.name,
      description: habit.description,
      type: habit.type,
      frequency: habit.frequency,
      created_at: habit.created_at,
      updated_at: habit.updated_at
    };
  } catch (error) {
    console.error('Failed to fetch habit by ID:', error);
    throw error;
  }
}