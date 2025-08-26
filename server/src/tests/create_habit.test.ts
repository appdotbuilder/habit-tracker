import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitsTable } from '../db/schema';
import { type CreateHabitInput } from '../schema';
import { createHabit } from '../handlers/create_habit';
import { eq } from 'drizzle-orm';

// Test input for daily habit
const testInputDaily: CreateHabitInput = {
  name: 'Daily Meditation',
  description: 'Practice mindfulness meditation every day',
  type: 'daily',
  frequency: 'daily'
};

// Test input for long-term habit
const testInputLongTerm: CreateHabitInput = {
  name: 'Read Books',
  description: 'Read at least one book per week',
  type: 'long-term',
  frequency: 'weekly'
};

// Test input with null description
const testInputNullDescription: CreateHabitInput = {
  name: 'Exercise',
  description: null,
  type: 'daily',
  frequency: 'monday'
};

describe('createHabit', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a daily habit', async () => {
    const result = await createHabit(testInputDaily);

    // Basic field validation
    expect(result.name).toEqual('Daily Meditation');
    expect(result.description).toEqual('Practice mindfulness meditation every day');
    expect(result.type).toEqual('daily');
    expect(result.frequency).toEqual('daily');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a long-term habit', async () => {
    const result = await createHabit(testInputLongTerm);

    expect(result.name).toEqual('Read Books');
    expect(result.description).toEqual('Read at least one book per week');
    expect(result.type).toEqual('long-term');
    expect(result.frequency).toEqual('weekly');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a habit with null description', async () => {
    const result = await createHabit(testInputNullDescription);

    expect(result.name).toEqual('Exercise');
    expect(result.description).toBeNull();
    expect(result.type).toEqual('daily');
    expect(result.frequency).toEqual('monday');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save habit to database', async () => {
    const result = await createHabit(testInputDaily);

    // Query using proper drizzle syntax
    const habits = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, result.id))
      .execute();

    expect(habits).toHaveLength(1);
    expect(habits[0].name).toEqual('Daily Meditation');
    expect(habits[0].description).toEqual('Practice mindfulness meditation every day');
    expect(habits[0].type).toEqual('daily');
    expect(habits[0].frequency).toEqual('daily');
    expect(habits[0].created_at).toBeInstanceOf(Date);
    expect(habits[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple habits with unique IDs', async () => {
    const habit1 = await createHabit(testInputDaily);
    const habit2 = await createHabit(testInputLongTerm);

    expect(habit1.id).not.toEqual(habit2.id);
    expect(habit1.name).toEqual('Daily Meditation');
    expect(habit2.name).toEqual('Read Books');

    // Verify both habits exist in database
    const allHabits = await db.select()
      .from(habitsTable)
      .execute();

    expect(allHabits).toHaveLength(2);
    expect(allHabits.map(h => h.id)).toContain(habit1.id);
    expect(allHabits.map(h => h.id)).toContain(habit2.id);
  });

  it('should handle all frequency options correctly', async () => {
    const frequencyInputs = [
      { ...testInputDaily, frequency: 'tuesday' as const },
      { ...testInputDaily, frequency: 'wednesday' as const },
      { ...testInputDaily, frequency: 'thursday' as const },
      { ...testInputDaily, frequency: 'friday' as const },
      { ...testInputDaily, frequency: 'saturday' as const },
      { ...testInputDaily, frequency: 'sunday' as const }
    ];

    for (const input of frequencyInputs) {
      const result = await createHabit(input);
      expect(result.frequency).toEqual(input.frequency);
    }
  });

  it('should set created_at and updated_at timestamps', async () => {
    const beforeCreation = new Date();
    const result = await createHabit(testInputDaily);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});