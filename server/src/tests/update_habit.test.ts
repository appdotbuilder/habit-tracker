import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitsTable } from '../db/schema';
import { type UpdateHabitInput } from '../schema';
import { updateHabit } from '../handlers/update_habit';
import { eq } from 'drizzle-orm';

// Create test habit helper
const createTestHabit = async () => {
  const result = await db.insert(habitsTable)
    .values({
      name: 'Original Habit',
      description: 'Original description',
      type: 'daily',
      frequency: 'daily'
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateHabit', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update habit name only', async () => {
    const originalHabit = await createTestHabit();
    
    const updateInput: UpdateHabitInput = {
      id: originalHabit.id,
      name: 'Updated Habit Name'
    };

    const result = await updateHabit(updateInput);

    expect(result.id).toEqual(originalHabit.id);
    expect(result.name).toEqual('Updated Habit Name');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.type).toEqual('daily'); // Unchanged
    expect(result.frequency).toEqual('daily'); // Unchanged
    expect(result.created_at).toEqual(originalHabit.created_at);
    expect(result.updated_at).not.toEqual(originalHabit.updated_at); // Should be updated
  });

  it('should update habit description only', async () => {
    const originalHabit = await createTestHabit();
    
    const updateInput: UpdateHabitInput = {
      id: originalHabit.id,
      description: 'Updated description'
    };

    const result = await updateHabit(updateInput);

    expect(result.id).toEqual(originalHabit.id);
    expect(result.name).toEqual('Original Habit'); // Unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.type).toEqual('daily'); // Unchanged
    expect(result.frequency).toEqual('daily'); // Unchanged
    expect(result.updated_at).not.toEqual(originalHabit.updated_at);
  });

  it('should update habit type and frequency', async () => {
    const originalHabit = await createTestHabit();
    
    const updateInput: UpdateHabitInput = {
      id: originalHabit.id,
      type: 'long-term',
      frequency: 'weekly'
    };

    const result = await updateHabit(updateInput);

    expect(result.id).toEqual(originalHabit.id);
    expect(result.name).toEqual('Original Habit'); // Unchanged
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.type).toEqual('long-term');
    expect(result.frequency).toEqual('weekly');
    expect(result.updated_at).not.toEqual(originalHabit.updated_at);
  });

  it('should update all fields', async () => {
    const originalHabit = await createTestHabit();
    
    const updateInput: UpdateHabitInput = {
      id: originalHabit.id,
      name: 'Completely Updated Habit',
      description: 'Completely updated description',
      type: 'long-term',
      frequency: 'monday'
    };

    const result = await updateHabit(updateInput);

    expect(result.id).toEqual(originalHabit.id);
    expect(result.name).toEqual('Completely Updated Habit');
    expect(result.description).toEqual('Completely updated description');
    expect(result.type).toEqual('long-term');
    expect(result.frequency).toEqual('monday');
    expect(result.created_at).toEqual(originalHabit.created_at); // Should not change
    expect(result.updated_at).not.toEqual(originalHabit.updated_at); // Should be updated
  });

  it('should set description to null', async () => {
    const originalHabit = await createTestHabit();
    
    const updateInput: UpdateHabitInput = {
      id: originalHabit.id,
      description: null
    };

    const result = await updateHabit(updateInput);

    expect(result.id).toEqual(originalHabit.id);
    expect(result.name).toEqual('Original Habit'); // Unchanged
    expect(result.description).toBeNull();
    expect(result.type).toEqual('daily'); // Unchanged
    expect(result.frequency).toEqual('daily'); // Unchanged
    expect(result.updated_at).not.toEqual(originalHabit.updated_at);
  });

  it('should update database record', async () => {
    const originalHabit = await createTestHabit();
    
    const updateInput: UpdateHabitInput = {
      id: originalHabit.id,
      name: 'Database Test Habit',
      description: 'Testing database update'
    };

    await updateHabit(updateInput);

    // Verify the database was actually updated
    const updatedHabits = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, originalHabit.id))
      .execute();

    expect(updatedHabits).toHaveLength(1);
    const dbHabit = updatedHabits[0];
    expect(dbHabit.name).toEqual('Database Test Habit');
    expect(dbHabit.description).toEqual('Testing database update');
    expect(dbHabit.type).toEqual('daily'); // Unchanged
    expect(dbHabit.frequency).toEqual('daily'); // Unchanged
    expect(dbHabit.updated_at).not.toEqual(originalHabit.updated_at);
  });

  it('should update only updated_at when no other fields provided', async () => {
    const originalHabit = await createTestHabit();
    
    const updateInput: UpdateHabitInput = {
      id: originalHabit.id
    };

    const result = await updateHabit(updateInput);

    expect(result.id).toEqual(originalHabit.id);
    expect(result.name).toEqual('Original Habit'); // Unchanged
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.type).toEqual('daily'); // Unchanged
    expect(result.frequency).toEqual('daily'); // Unchanged
    expect(result.created_at).toEqual(originalHabit.created_at); // Should not change
    expect(result.updated_at).not.toEqual(originalHabit.updated_at); // Should be updated
  });

  it('should throw error for non-existent habit', async () => {
    const updateInput: UpdateHabitInput = {
      id: 99999,
      name: 'Non-existent Habit'
    };

    await expect(updateHabit(updateInput)).rejects.toThrow(/habit with id 99999 not found/i);
  });

  it('should handle different frequency values correctly', async () => {
    const originalHabit = await createTestHabit();
    
    // Test updating to different frequency values
    const frequencies: Array<'weekly' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> = 
      ['weekly', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const frequency of frequencies) {
      const updateInput: UpdateHabitInput = {
        id: originalHabit.id,
        frequency: frequency
      };

      const result = await updateHabit(updateInput);
      expect(result.frequency).toEqual(frequency);
    }
  });
});