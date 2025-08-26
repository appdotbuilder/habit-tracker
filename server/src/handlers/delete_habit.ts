import { db } from '../db';
import { habitsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type DeleteHabitInput } from '../schema';

export async function deleteHabit(input: DeleteHabitInput): Promise<{ success: boolean }> {
  try {
    // Delete the habit - CASCADE will automatically remove associated completions
    const result = await db.delete(habitsTable)
      .where(eq(habitsTable.id, input.id))
      .returning()
      .execute();

    // Return success status based on whether any rows were affected
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Habit deletion failed:', error);
    throw error;
  }
}