import { db } from '../db';
import { habitsTable, habitCompletionsTable } from '../db/schema';
import { type MarkHabitCompleteInput, type HabitCompletion } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function markHabitComplete(input: MarkHabitCompleteInput): Promise<HabitCompletion> {
  try {
    const completedDate = input.completed_date || new Date();
    
    // First verify the habit exists
    const existingHabit = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, input.habit_id))
      .execute();
    
    if (existingHabit.length === 0) {
      throw new Error('Habit not found');
    }

    // Check if this habit is already completed for this date
    // Use date comparison by converting to date strings to avoid time comparison issues
    const completedDateStr = completedDate.toDateString();
    
    const existingCompletions = await db.select()
      .from(habitCompletionsTable)
      .where(eq(habitCompletionsTable.habit_id, input.habit_id))
      .execute();
    
    // Check for duplicate completion on the same date
    const duplicateCompletion = existingCompletions.find(completion => 
      completion.completed_date.toDateString() === completedDateStr
    );
    
    if (duplicateCompletion) {
      throw new Error('Habit already completed for this date');
    }

    // Insert the completion record
    const result = await db.insert(habitCompletionsTable)
      .values({
        habit_id: input.habit_id,
        completed_date: completedDate
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Mark habit complete failed:', error);
    throw error;
  }
}