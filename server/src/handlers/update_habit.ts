import { db } from '../db';
import { habitsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateHabitInput, type Habit } from '../schema';

export const updateHabit = async (input: UpdateHabitInput): Promise<Habit> => {
  try {
    // Build the update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date(), // Always update the timestamp
    };

    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    
    if (input.description !== undefined) {
      updateData['description'] = input.description;
    }
    
    if (input.type !== undefined) {
      updateData['type'] = input.type;
    }
    
    if (input.frequency !== undefined) {
      updateData['frequency'] = input.frequency;
    }

    // Update the habit and return the updated record
    const result = await db.update(habitsTable)
      .set(updateData)
      .where(eq(habitsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Habit with ID ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Habit update failed:', error);
    throw error;
  }
};