import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitsTable, habitCompletionsTable } from '../db/schema';
import { type CreateHabitInput } from '../schema';
import { getHabitsWithProgress } from '../handlers/get_habits_with_progress';

const testHabit: CreateHabitInput = {
  name: 'Daily Exercise',
  description: 'Go for a run or workout',
  type: 'daily',
  frequency: 'daily'
};

const testWeeklyHabit: CreateHabitInput = {
  name: 'Weekly Review',
  description: 'Review weekly goals',
  type: 'long-term',
  frequency: 'weekly'
};

describe('getHabitsWithProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no habits exist', async () => {
    const result = await getHabitsWithProgress();
    expect(result).toEqual([]);
  });

  it('should return habit with zero progress when no completions exist', async () => {
    // Create a habit
    const [habit] = await db.insert(habitsTable)
      .values(testHabit)
      .returning()
      .execute();

    const result = await getHabitsWithProgress();
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(habit.id);
    expect(result[0].name).toEqual('Daily Exercise');
    expect(result[0].description).toEqual('Go for a run or workout');
    expect(result[0].type).toEqual('daily');
    expect(result[0].frequency).toEqual('daily');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    
    // Progress should be all zeros/nulls
    expect(result[0].progress).toEqual({
      habit_id: habit.id,
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
      total_completions: 0,
      completion_rate: 0
    });
  });

  it('should calculate basic progress metrics correctly', async () => {
    // Create a habit
    const [habit] = await db.insert(habitsTable)
      .values(testHabit)
      .returning()
      .execute();

    // Add some completions
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(habitCompletionsTable)
      .values([
        { habit_id: habit.id, completed_date: yesterday },
        { habit_id: habit.id, completed_date: today }
      ])
      .execute();

    const result = await getHabitsWithProgress();
    
    expect(result).toHaveLength(1);
    expect(result[0].progress.total_completions).toEqual(2);
    expect(result[0].progress.last_completed_date).toBeInstanceOf(Date);
    expect(result[0].progress.current_streak).toBeGreaterThan(0);
    expect(result[0].progress.longest_streak).toBeGreaterThan(0);
    expect(result[0].progress.completion_rate).toBeGreaterThan(0);
    expect(result[0].progress.completion_rate).toBeLessThanOrEqual(1);
  });

  it('should calculate current streak correctly for consecutive days', async () => {
    // Create a habit
    const [habit] = await db.insert(habitsTable)
      .values(testHabit)
      .returning()
      .execute();

    // Add completions for 3 consecutive days ending today
    const today = new Date();
    const dates = [];
    for (let i = 2; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }

    await db.insert(habitCompletionsTable)
      .values(dates.map(date => ({ habit_id: habit.id, completed_date: date })))
      .execute();

    const result = await getHabitsWithProgress();
    
    expect(result[0].progress.current_streak).toEqual(3);
    expect(result[0].progress.longest_streak).toEqual(3);
    expect(result[0].progress.total_completions).toEqual(3);
  });

  it('should reset current streak when days are not consecutive', async () => {
    // Create a habit
    const [habit] = await db.insert(habitsTable)
      .values(testHabit)
      .returning()
      .execute();

    // Add completions: 3 days ago, 2 days ago, then skip yesterday, then today
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    await db.insert(habitCompletionsTable)
      .values([
        { habit_id: habit.id, completed_date: threeDaysAgo },
        { habit_id: habit.id, completed_date: twoDaysAgo },
        { habit_id: habit.id, completed_date: today }
      ])
      .execute();

    const result = await getHabitsWithProgress();
    
    expect(result[0].progress.current_streak).toEqual(1); // Only today
    expect(result[0].progress.longest_streak).toEqual(2); // threeDaysAgo + twoDaysAgo
    expect(result[0].progress.total_completions).toEqual(3);
  });

  it('should handle multiple habits with different progress', async () => {
    // Create two habits
    const [habit1] = await db.insert(habitsTable)
      .values(testHabit)
      .returning()
      .execute();

    const [habit2] = await db.insert(habitsTable)
      .values(testWeeklyHabit)
      .returning()
      .execute();

    // Add completions only to first habit
    const today = new Date();
    await db.insert(habitCompletionsTable)
      .values([{ habit_id: habit1.id, completed_date: today }])
      .execute();

    const result = await getHabitsWithProgress();
    
    expect(result).toHaveLength(2);
    
    // Find each habit in results
    const habit1Result = result.find(h => h.id === habit1.id);
    const habit2Result = result.find(h => h.id === habit2.id);
    
    expect(habit1Result).toBeDefined();
    expect(habit2Result).toBeDefined();
    
    // First habit should have completions
    expect(habit1Result!.progress.total_completions).toEqual(1);
    expect(habit1Result!.progress.current_streak).toEqual(1);
    
    // Second habit should have no completions
    expect(habit2Result!.progress.total_completions).toEqual(0);
    expect(habit2Result!.progress.current_streak).toEqual(0);
    expect(habit2Result!.progress.last_completed_date).toBeNull();
  });

  it('should handle duplicate completions on same day correctly', async () => {
    // Create a habit
    const [habit] = await db.insert(habitsTable)
      .values(testHabit)
      .returning()
      .execute();

    // Add multiple completions on the same day
    const today = new Date();
    await db.insert(habitCompletionsTable)
      .values([
        { habit_id: habit.id, completed_date: today },
        { habit_id: habit.id, completed_date: today }
      ])
      .execute();

    const result = await getHabitsWithProgress();
    
    expect(result[0].progress.total_completions).toEqual(2); // Count all entries
    expect(result[0].progress.current_streak).toEqual(1); // But streak should be 1 day
    expect(result[0].progress.longest_streak).toEqual(1);
  });

  it('should calculate completion rate for daily habits', async () => {
    // Create a habit with a specific creation date (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 2); // 3 days total including today
    
    const [habit] = await db.insert(habitsTable)
      .values({
        ...testHabit,
        created_at: threeDaysAgo,
        updated_at: threeDaysAgo
      })
      .returning()
      .execute();

    // Complete habit 2 out of 3 possible days
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();

    await db.insert(habitCompletionsTable)
      .values([
        { habit_id: habit.id, completed_date: yesterday },
        { habit_id: habit.id, completed_date: today }
      ])
      .execute();

    const result = await getHabitsWithProgress();
    
    expect(result[0].progress.total_completions).toEqual(2);
    expect(result[0].progress.completion_rate).toBeGreaterThan(0.6); // Roughly 2/3
    expect(result[0].progress.completion_rate).toBeLessThanOrEqual(1);
  });
});