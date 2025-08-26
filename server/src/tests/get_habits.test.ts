import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitsTable } from '../db/schema';
import { getHabits } from '../handlers/get_habits';

describe('getHabits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no habits exist', async () => {
    const result = await getHabits();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all habits from database', async () => {
    // Create test habits first
    await db.insert(habitsTable).values([
      {
        name: 'Morning Exercise',
        description: 'Daily workout routine',
        type: 'daily',
        frequency: 'daily'
      },
      {
        name: 'Read Books',
        description: null, // Test nullable field
        type: 'long-term',
        frequency: 'weekly'
      },
      {
        name: 'Meditation',
        description: 'Evening mindfulness practice',
        type: 'daily',
        frequency: 'monday'
      }
    ]).execute();

    const result = await getHabits();

    expect(result).toHaveLength(3);
    
    // Verify structure and data types
    result.forEach(habit => {
      expect(habit.id).toBeNumber();
      expect(habit.name).toBeString();
      expect(habit.type).toMatch(/^(daily|long-term)$/);
      expect(habit.frequency).toMatch(/^(daily|weekly|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
      expect(habit.created_at).toBeInstanceOf(Date);
      expect(habit.updated_at).toBeInstanceOf(Date);
      // description can be string or null
      if (habit.description !== null) {
        expect(habit.description).toBeString();
      }
    });

    // Verify specific habit data
    const exerciseHabit = result.find(h => h.name === 'Morning Exercise');
    expect(exerciseHabit).toBeDefined();
    expect(exerciseHabit?.description).toEqual('Daily workout routine');
    expect(exerciseHabit?.type).toEqual('daily');
    expect(exerciseHabit?.frequency).toEqual('daily');

    const readingHabit = result.find(h => h.name === 'Read Books');
    expect(readingHabit).toBeDefined();
    expect(readingHabit?.description).toBeNull();
    expect(readingHabit?.type).toEqual('long-term');
    expect(readingHabit?.frequency).toEqual('weekly');

    const meditationHabit = result.find(h => h.name === 'Meditation');
    expect(meditationHabit).toBeDefined();
    expect(meditationHabit?.description).toEqual('Evening mindfulness practice');
    expect(meditationHabit?.type).toEqual('daily');
    expect(meditationHabit?.frequency).toEqual('monday');
  });

  it('should return habits with all enum values', async () => {
    // Test all possible enum combinations
    await db.insert(habitsTable).values([
      {
        name: 'Daily Habit',
        type: 'daily',
        frequency: 'daily'
      },
      {
        name: 'Long-term Habit',
        type: 'long-term',
        frequency: 'weekly'
      },
      {
        name: 'Monday Habit',
        type: 'daily',
        frequency: 'monday'
      },
      {
        name: 'Tuesday Habit',
        type: 'daily',
        frequency: 'tuesday'
      },
      {
        name: 'Wednesday Habit',
        type: 'daily',
        frequency: 'wednesday'
      },
      {
        name: 'Thursday Habit',
        type: 'daily',
        frequency: 'thursday'
      },
      {
        name: 'Friday Habit',
        type: 'daily',
        frequency: 'friday'
      },
      {
        name: 'Saturday Habit',
        type: 'daily',
        frequency: 'saturday'
      },
      {
        name: 'Sunday Habit',
        type: 'daily',
        frequency: 'sunday'
      }
    ]).execute();

    const result = await getHabits();

    expect(result).toHaveLength(9);

    // Verify all habit types are present
    const habitTypes = result.map(h => h.type);
    expect(habitTypes).toContain('daily');
    expect(habitTypes).toContain('long-term');

    // Verify all frequencies are present
    const frequencies = result.map(h => h.frequency);
    expect(frequencies).toContain('daily');
    expect(frequencies).toContain('weekly');
    expect(frequencies).toContain('monday');
    expect(frequencies).toContain('tuesday');
    expect(frequencies).toContain('wednesday');
    expect(frequencies).toContain('thursday');
    expect(frequencies).toContain('friday');
    expect(frequencies).toContain('saturday');
    expect(frequencies).toContain('sunday');
  });

  it('should return habits with proper timestamp fields', async () => {
    // Create habit and verify timestamp handling
    await db.insert(habitsTable).values({
      name: 'Test Habit',
      type: 'daily',
      frequency: 'daily'
    }).execute();

    const result = await getHabits();

    expect(result).toHaveLength(1);
    const habit = result[0];

    // Verify timestamp fields are Date objects
    expect(habit.created_at).toBeInstanceOf(Date);
    expect(habit.updated_at).toBeInstanceOf(Date);

    // Verify timestamps are recent (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    expect(habit.created_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    expect(habit.created_at.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(habit.updated_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    expect(habit.updated_at.getTime()).toBeLessThanOrEqual(now.getTime());
  });

  it('should handle large number of habits', async () => {
    // Create multiple habits to test performance and handling
    const habitData = Array.from({ length: 50 }, (_, i) => ({
      name: `Habit ${i + 1}`,
      description: i % 2 === 0 ? `Description for habit ${i + 1}` : null,
      type: i % 2 === 0 ? 'daily' as const : 'long-term' as const,
      frequency: i % 7 === 0 ? 'weekly' as const : 'daily' as const
    }));

    await db.insert(habitsTable).values(habitData).execute();

    const result = await getHabits();

    expect(result).toHaveLength(50);

    // Verify all habits have proper structure
    result.forEach((habit, index) => {
      expect(habit.name).toEqual(`Habit ${index + 1}`);
      expect(habit.id).toBeNumber();
      expect(habit.created_at).toBeInstanceOf(Date);
      expect(habit.updated_at).toBeInstanceOf(Date);
    });

    // Verify mixed null/non-null descriptions
    const habitsWithDescription = result.filter(h => h.description !== null);
    const habitsWithoutDescription = result.filter(h => h.description === null);
    expect(habitsWithDescription.length).toEqual(25);
    expect(habitsWithoutDescription.length).toEqual(25);
  });
});