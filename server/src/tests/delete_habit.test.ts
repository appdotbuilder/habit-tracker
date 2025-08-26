import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitsTable, habitCompletionsTable } from '../db/schema';
import { type DeleteHabitInput } from '../schema';
import { deleteHabit } from '../handlers/delete_habit';
import { eq } from 'drizzle-orm';

describe('deleteHabit', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing habit', async () => {
    // Create a test habit
    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Test Habit',
        description: 'A habit for testing deletion',
        type: 'daily',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const habitId = habitResult[0].id;

    // Delete the habit
    const input: DeleteHabitInput = { id: habitId };
    const result = await deleteHabit(input);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify habit no longer exists in database
    const habits = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, habitId))
      .execute();

    expect(habits).toHaveLength(0);
  });

  it('should return false for non-existent habit', async () => {
    // Try to delete a habit that doesn't exist
    const input: DeleteHabitInput = { id: 999 };
    const result = await deleteHabit(input);

    // Verify deletion was not successful
    expect(result.success).toBe(false);
  });

  it('should cascade delete associated habit completions', async () => {
    // Create a test habit
    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Test Habit with Completions',
        description: 'A habit with completions to test cascade delete',
        type: 'daily',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const habitId = habitResult[0].id;

    // Create some habit completions
    await db.insert(habitCompletionsTable)
      .values([
        {
          habit_id: habitId,
          completed_date: new Date('2024-01-01')
        },
        {
          habit_id: habitId,
          completed_date: new Date('2024-01-02')
        },
        {
          habit_id: habitId,
          completed_date: new Date('2024-01-03')
        }
      ])
      .execute();

    // Verify completions exist before deletion
    const completionsBefore = await db.select()
      .from(habitCompletionsTable)
      .where(eq(habitCompletionsTable.habit_id, habitId))
      .execute();

    expect(completionsBefore).toHaveLength(3);

    // Delete the habit
    const input: DeleteHabitInput = { id: habitId };
    const result = await deleteHabit(input);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify habit no longer exists
    const habits = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, habitId))
      .execute();

    expect(habits).toHaveLength(0);

    // Verify associated completions were also deleted (CASCADE)
    const completionsAfter = await db.select()
      .from(habitCompletionsTable)
      .where(eq(habitCompletionsTable.habit_id, habitId))
      .execute();

    expect(completionsAfter).toHaveLength(0);
  });

  it('should not affect other habits when deleting one habit', async () => {
    // Create multiple test habits
    const habit1Result = await db.insert(habitsTable)
      .values({
        name: 'Habit 1',
        description: 'First habit',
        type: 'daily',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const habit2Result = await db.insert(habitsTable)
      .values({
        name: 'Habit 2',
        description: 'Second habit',
        type: 'long-term',
        frequency: 'weekly'
      })
      .returning()
      .execute();

    const habit1Id = habit1Result[0].id;
    const habit2Id = habit2Result[0].id;

    // Create completions for both habits
    await db.insert(habitCompletionsTable)
      .values([
        {
          habit_id: habit1Id,
          completed_date: new Date('2024-01-01')
        },
        {
          habit_id: habit2Id,
          completed_date: new Date('2024-01-01')
        }
      ])
      .execute();

    // Delete only the first habit
    const input: DeleteHabitInput = { id: habit1Id };
    const result = await deleteHabit(input);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify first habit and its completion are gone
    const habit1After = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, habit1Id))
      .execute();

    const habit1CompletionsAfter = await db.select()
      .from(habitCompletionsTable)
      .where(eq(habitCompletionsTable.habit_id, habit1Id))
      .execute();

    expect(habit1After).toHaveLength(0);
    expect(habit1CompletionsAfter).toHaveLength(0);

    // Verify second habit and its completion still exist
    const habit2After = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, habit2Id))
      .execute();

    const habit2CompletionsAfter = await db.select()
      .from(habitCompletionsTable)
      .where(eq(habitCompletionsTable.habit_id, habit2Id))
      .execute();

    expect(habit2After).toHaveLength(1);
    expect(habit2After[0].name).toEqual('Habit 2');
    expect(habit2CompletionsAfter).toHaveLength(1);
  });

  it('should handle deletion of habit with no completions', async () => {
    // Create a test habit with no completions
    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Lonely Habit',
        description: 'A habit with no completions',
        type: 'daily',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const habitId = habitResult[0].id;

    // Delete the habit
    const input: DeleteHabitInput = { id: habitId };
    const result = await deleteHabit(input);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify habit no longer exists
    const habits = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, habitId))
      .execute();

    expect(habits).toHaveLength(0);
  });
});