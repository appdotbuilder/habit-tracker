import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitsTable } from '../db/schema';
import { type GetHabitByIdInput } from '../schema';
import { getHabitById } from '../handlers/get_habit_by_id';

// Test habit data
const testHabitData = {
  name: 'Test Habit',
  description: 'A habit for testing',
  type: 'daily' as const,
  frequency: 'daily' as const
};

const testHabitDataWithoutDescription = {
  name: 'Another Test Habit',
  description: null,
  type: 'long-term' as const,
  frequency: 'weekly' as const
};

describe('getHabitById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return habit when found by valid ID', async () => {
    // First create a habit to fetch
    const insertResult = await db.insert(habitsTable)
      .values(testHabitData)
      .returning()
      .execute();

    const createdHabit = insertResult[0];

    const input: GetHabitByIdInput = {
      id: createdHabit.id
    };

    const result = await getHabitById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdHabit.id);
    expect(result!.name).toEqual('Test Habit');
    expect(result!.description).toEqual('A habit for testing');
    expect(result!.type).toEqual('daily');
    expect(result!.frequency).toEqual('daily');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return habit with null description', async () => {
    // Create a habit with null description
    const insertResult = await db.insert(habitsTable)
      .values(testHabitDataWithoutDescription)
      .returning()
      .execute();

    const createdHabit = insertResult[0];

    const input: GetHabitByIdInput = {
      id: createdHabit.id
    };

    const result = await getHabitById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdHabit.id);
    expect(result!.name).toEqual('Another Test Habit');
    expect(result!.description).toBeNull();
    expect(result!.type).toEqual('long-term');
    expect(result!.frequency).toEqual('weekly');
  });

  it('should return null when habit not found by ID', async () => {
    const input: GetHabitByIdInput = {
      id: 999999 // Non-existent ID
    };

    const result = await getHabitById(input);

    expect(result).toBeNull();
  });

  it('should return correct habit when multiple habits exist', async () => {
    // Create multiple habits
    const habit1Result = await db.insert(habitsTable)
      .values({
        name: 'First Habit',
        description: 'First description',
        type: 'daily',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const habit2Result = await db.insert(habitsTable)
      .values({
        name: 'Second Habit',
        description: 'Second description',
        type: 'long-term',
        frequency: 'weekly'
      })
      .returning()
      .execute();

    const habit3Result = await db.insert(habitsTable)
      .values({
        name: 'Third Habit',
        description: 'Third description',
        type: 'daily',
        frequency: 'monday'
      })
      .returning()
      .execute();

    // Fetch the second habit
    const input: GetHabitByIdInput = {
      id: habit2Result[0].id
    };

    const result = await getHabitById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(habit2Result[0].id);
    expect(result!.name).toEqual('Second Habit');
    expect(result!.description).toEqual('Second description');
    expect(result!.type).toEqual('long-term');
    expect(result!.frequency).toEqual('weekly');
  });

  it('should handle different frequency types correctly', async () => {
    // Test with specific weekday frequency
    const mondayHabitResult = await db.insert(habitsTable)
      .values({
        name: 'Monday Habit',
        description: 'Only on Mondays',
        type: 'daily',
        frequency: 'monday'
      })
      .returning()
      .execute();

    const input: GetHabitByIdInput = {
      id: mondayHabitResult[0].id
    };

    const result = await getHabitById(input);

    expect(result).not.toBeNull();
    expect(result!.frequency).toEqual('monday');
    expect(result!.name).toEqual('Monday Habit');
  });

  it('should preserve timestamps correctly', async () => {
    // Create a habit and verify timestamps are preserved
    const insertResult = await db.insert(habitsTable)
      .values(testHabitData)
      .returning()
      .execute();

    const createdHabit = insertResult[0];
    const originalCreatedAt = createdHabit.created_at;
    const originalUpdatedAt = createdHabit.updated_at;

    const input: GetHabitByIdInput = {
      id: createdHabit.id
    };

    const result = await getHabitById(input);

    expect(result).not.toBeNull();
    expect(result!.created_at).toEqual(originalCreatedAt);
    expect(result!.updated_at).toEqual(originalUpdatedAt);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});