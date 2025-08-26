import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitsTable, habitCompletionsTable } from '../db/schema';
import { type MarkHabitCompleteInput } from '../schema';
import { markHabitComplete } from '../handlers/mark_habit_complete';
import { eq } from 'drizzle-orm';

describe('markHabitComplete', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testHabitId: number;

  beforeEach(async () => {
    // Create a test habit for each test
    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Test Habit',
        description: 'A habit for testing',
        type: 'daily',
        frequency: 'daily'
      })
      .returning()
      .execute();

    testHabitId = habitResult[0].id;
  });

  it('should mark habit as complete with current date when no date provided', async () => {
    const input: MarkHabitCompleteInput = {
      habit_id: testHabitId
    };

    const result = await markHabitComplete(input);

    expect(result.habit_id).toEqual(testHabitId);
    expect(result.id).toBeDefined();
    expect(result.completed_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify it was saved to database
    const completions = await db.select()
      .from(habitCompletionsTable)
      .where(eq(habitCompletionsTable.habit_id, testHabitId))
      .execute();

    expect(completions).toHaveLength(1);
    expect(completions[0].habit_id).toEqual(testHabitId);
  });

  it('should mark habit as complete with specified date', async () => {
    const completedDate = new Date('2024-01-15T10:30:00Z');
    const input: MarkHabitCompleteInput = {
      habit_id: testHabitId,
      completed_date: completedDate
    };

    const result = await markHabitComplete(input);

    expect(result.habit_id).toEqual(testHabitId);
    expect(result.completed_date).toEqual(completedDate);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify it was saved to database with correct date
    const completions = await db.select()
      .from(habitCompletionsTable)
      .where(eq(habitCompletionsTable.habit_id, testHabitId))
      .execute();

    expect(completions).toHaveLength(1);
    expect(completions[0].completed_date).toEqual(completedDate);
  });

  it('should prevent duplicate completions for same date', async () => {
    const completedDate = new Date('2024-01-15T10:30:00Z');
    const input: MarkHabitCompleteInput = {
      habit_id: testHabitId,
      completed_date: completedDate
    };

    // First completion should succeed
    await markHabitComplete(input);

    // Second completion for same date should fail
    await expect(markHabitComplete(input)).rejects.toThrow(/already completed for this date/i);

    // Verify only one completion exists
    const completions = await db.select()
      .from(habitCompletionsTable)
      .where(eq(habitCompletionsTable.habit_id, testHabitId))
      .execute();

    expect(completions).toHaveLength(1);
  });

  it('should allow completions for different dates', async () => {
    const date1 = new Date('2024-01-15T10:30:00Z');
    const date2 = new Date('2024-01-16T10:30:00Z');

    const input1: MarkHabitCompleteInput = {
      habit_id: testHabitId,
      completed_date: date1
    };

    const input2: MarkHabitCompleteInput = {
      habit_id: testHabitId,
      completed_date: date2
    };

    // Both completions should succeed
    await markHabitComplete(input1);
    await markHabitComplete(input2);

    // Verify both completions exist
    const completions = await db.select()
      .from(habitCompletionsTable)
      .where(eq(habitCompletionsTable.habit_id, testHabitId))
      .execute();

    expect(completions).toHaveLength(2);
    
    const completedDates = completions.map(c => c.completed_date.toISOString());
    expect(completedDates).toContain(date1.toISOString());
    expect(completedDates).toContain(date2.toISOString());
  });

  it('should handle same date with different times as duplicate', async () => {
    const date1 = new Date('2024-01-15T10:30:00Z');
    const date2 = new Date('2024-01-15T20:45:00Z'); // Same date, different time

    const input1: MarkHabitCompleteInput = {
      habit_id: testHabitId,
      completed_date: date1
    };

    const input2: MarkHabitCompleteInput = {
      habit_id: testHabitId,
      completed_date: date2
    };

    // First completion should succeed
    await markHabitComplete(input1);

    // Second completion for same date (different time) should fail
    await expect(markHabitComplete(input2)).rejects.toThrow(/already completed for this date/i);
  });

  it('should throw error when habit does not exist', async () => {
    const nonExistentHabitId = 99999;
    const input: MarkHabitCompleteInput = {
      habit_id: nonExistentHabitId
    };

    await expect(markHabitComplete(input)).rejects.toThrow(/habit not found/i);

    // Verify no completion was created
    const completions = await db.select()
      .from(habitCompletionsTable)
      .where(eq(habitCompletionsTable.habit_id, nonExistentHabitId))
      .execute();

    expect(completions).toHaveLength(0);
  });
});