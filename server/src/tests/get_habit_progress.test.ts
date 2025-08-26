import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitsTable, habitCompletionsTable } from '../db/schema';
import { type GetHabitByIdInput } from '../schema';
import { getHabitProgress } from '../handlers/get_habit_progress';

describe('getHabitProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent habit', async () => {
    const input: GetHabitByIdInput = { id: 999 };
    const result = await getHabitProgress(input);
    expect(result).toBeNull();
  });

  it('should return zero progress for habit with no completions', async () => {
    // Create a habit
    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Test Habit',
        description: 'A test habit',
        type: 'daily',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const habit = habitResult[0];
    const input: GetHabitByIdInput = { id: habit.id };

    const result = await getHabitProgress(input);

    expect(result).not.toBeNull();
    expect(result!.habit_id).toBe(habit.id);
    expect(result!.current_streak).toBe(0);
    expect(result!.longest_streak).toBe(0);
    expect(result!.last_completed_date).toBeNull();
    expect(result!.total_completions).toBe(0);
    expect(result!.completion_rate).toBe(0);
  });

  it('should calculate basic progress for daily habit', async () => {
    // Create a habit
    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Daily Exercise',
        description: 'Exercise every day',
        type: 'daily',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const habit = habitResult[0];

    // Add some completions
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    await db.insert(habitCompletionsTable)
      .values([
        {
          habit_id: habit.id,
          completed_date: twoDaysAgo
        },
        {
          habit_id: habit.id,
          completed_date: yesterday
        },
        {
          habit_id: habit.id,
          completed_date: today
        }
      ])
      .execute();

    const input: GetHabitByIdInput = { id: habit.id };
    const result = await getHabitProgress(input);

    expect(result).not.toBeNull();
    expect(result!.habit_id).toBe(habit.id);
    expect(result!.total_completions).toBe(3);
    expect(result!.current_streak).toBeGreaterThan(0);
    expect(result!.longest_streak).toBeGreaterThan(0);
    expect(result!.last_completed_date).toBeInstanceOf(Date);
    expect(typeof result!.completion_rate).toBe('number');
    expect(result!.completion_rate).toBeGreaterThan(0);
    expect(result!.completion_rate).toBeLessThanOrEqual(1);
  });

  it('should calculate progress for weekly habit', async () => {
    // Create a weekly habit
    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Weekly Planning',
        description: 'Plan the week',
        type: 'long-term',
        frequency: 'weekly'
      })
      .returning()
      .execute();

    const habit = habitResult[0];

    // Add completions over multiple weeks
    const thisWeek = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    await db.insert(habitCompletionsTable)
      .values([
        {
          habit_id: habit.id,
          completed_date: twoWeeksAgo
        },
        {
          habit_id: habit.id,
          completed_date: lastWeek
        },
        {
          habit_id: habit.id,
          completed_date: thisWeek
        }
      ])
      .execute();

    const input: GetHabitByIdInput = { id: habit.id };
    const result = await getHabitProgress(input);

    expect(result).not.toBeNull();
    expect(result!.habit_id).toBe(habit.id);
    expect(result!.total_completions).toBe(3);
    expect(result!.current_streak).toBeGreaterThan(0);
    expect(result!.longest_streak).toBeGreaterThan(0);
    expect(result!.last_completed_date).toBeInstanceOf(Date);
    expect(result!.completion_rate).toBeGreaterThan(0);
  });

  it('should calculate progress for specific day habit (monday)', async () => {
    // Create a Monday habit
    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Monday Meetings',
        description: 'Team meeting every Monday',
        type: 'long-term',
        frequency: 'monday'
      })
      .returning()
      .execute();

    const habit = habitResult[0];

    // Find recent Mondays
    const today = new Date();
    const mondays = [];
    let currentDate = new Date(today);
    
    // Go back to find Mondays
    for (let i = 0; i < 30; i++) {
      if (currentDate.getDay() === 1) { // Monday is 1
        mondays.push(new Date(currentDate));
        if (mondays.length >= 3) break;
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }

    if (mondays.length >= 2) {
      await db.insert(habitCompletionsTable)
        .values(mondays.slice(0, 2).map(monday => ({
          habit_id: habit.id,
          completed_date: monday
        })))
        .execute();
    }

    const input: GetHabitByIdInput = { id: habit.id };
    const result = await getHabitProgress(input);

    expect(result).not.toBeNull();
    expect(result!.habit_id).toBe(habit.id);
    expect(result!.total_completions).toBe(Math.min(mondays.length, 2));
    expect(result!.current_streak).toBeGreaterThanOrEqual(0);
    expect(result!.longest_streak).toBeGreaterThanOrEqual(0);
    expect(typeof result!.completion_rate).toBe('number');
  });

  it('should handle broken streak correctly', async () => {
    // Create a daily habit
    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Reading',
        description: 'Read every day',
        type: 'daily',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const habit = habitResult[0];

    // Add completions with a gap (broken streak)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    await db.insert(habitCompletionsTable)
      .values([
        {
          habit_id: habit.id,
          completed_date: fiveDaysAgo
        },
        {
          habit_id: habit.id,
          completed_date: fourDaysAgo
        },
        // Gap here (3 days ago and day before yesterday not completed)
        {
          habit_id: habit.id,
          completed_date: yesterday
        },
        {
          habit_id: habit.id,
          completed_date: today
        }
      ])
      .execute();

    const input: GetHabitByIdInput = { id: habit.id };
    const result = await getHabitProgress(input);

    expect(result).not.toBeNull();
    expect(result!.total_completions).toBe(4);
    expect(result!.current_streak).toBeLessThan(result!.total_completions); // Current streak should be less than total
    expect(result!.longest_streak).toBeGreaterThan(1); // Should capture the longer streak
  });

  it('should calculate completion rate correctly', async () => {
    // Create a habit from 10 days ago
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 9); // 10 days including today

    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Water Intake',
        description: 'Drink water daily',
        type: 'daily',
        frequency: 'daily',
        created_at: tenDaysAgo,
        updated_at: tenDaysAgo
      })
      .returning()
      .execute();

    const habit = habitResult[0];

    // Complete habit 5 times out of 10 possible days
    const completionDates = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(tenDaysAgo);
      date.setDate(date.getDate() + i * 2); // Every other day
      completionDates.push(date);
    }

    await db.insert(habitCompletionsTable)
      .values(completionDates.map(date => ({
        habit_id: habit.id,
        completed_date: date
      })))
      .execute();

    const input: GetHabitByIdInput = { id: habit.id };
    const result = await getHabitProgress(input);

    expect(result).not.toBeNull();
    expect(result!.total_completions).toBe(5);
    expect(result!.completion_rate).toBeGreaterThan(0.4); // Should be around 0.5 (5/10)
    expect(result!.completion_rate).toBeLessThan(0.6);
  });

  it('should handle multiple completions on same day', async () => {
    // Create a habit
    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Meditation',
        description: 'Meditate daily',
        type: 'daily',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const habit = habitResult[0];

    const today = new Date();

    // Add multiple completions on the same day
    await db.insert(habitCompletionsTable)
      .values([
        {
          habit_id: habit.id,
          completed_date: today
        },
        {
          habit_id: habit.id,
          completed_date: today
        },
        {
          habit_id: habit.id,
          completed_date: today
        }
      ])
      .execute();

    const input: GetHabitByIdInput = { id: habit.id };
    const result = await getHabitProgress(input);

    expect(result).not.toBeNull();
    expect(result!.total_completions).toBe(3); // Should count all completions
    expect(result!.current_streak).toBe(1); // But streak should only count as 1 day
    expect(result!.longest_streak).toBe(1);
  });

  it('should handle edge case with very old habit', async () => {
    // Create a habit from long ago
    const longAgo = new Date('2020-01-01');

    const habitResult = await db.insert(habitsTable)
      .values({
        name: 'Ancient Habit',
        description: 'Very old habit',
        type: 'daily',
        frequency: 'daily',
        created_at: longAgo,
        updated_at: longAgo
      })
      .returning()
      .execute();

    const habit = habitResult[0];

    // Add a recent completion
    const today = new Date();
    await db.insert(habitCompletionsTable)
      .values([{
        habit_id: habit.id,
        completed_date: today
      }])
      .execute();

    const input: GetHabitByIdInput = { id: habit.id };
    const result = await getHabitProgress(input);

    expect(result).not.toBeNull();
    expect(result!.total_completions).toBe(1);
    expect(result!.current_streak).toBe(1);
    expect(result!.longest_streak).toBe(1);
    expect(result!.completion_rate).toBeLessThan(0.01); // Very low rate due to age
  });
});