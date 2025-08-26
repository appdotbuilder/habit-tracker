import { db } from '../db';
import { habitsTable, habitCompletionsTable } from '../db/schema';
import { type GetHabitByIdInput, type HabitProgress } from '../schema';
import { eq, desc, count, max } from 'drizzle-orm';

export async function getHabitProgress(input: GetHabitByIdInput): Promise<HabitProgress | null> {
  try {
    // First, verify the habit exists and get its details
    const habit = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, input.id))
      .execute();

    if (habit.length === 0) {
      return null; // Habit not found
    }

    const habitData = habit[0];

    // Get all completions for this habit, ordered by date (most recent first)
    const completions = await db.select()
      .from(habitCompletionsTable)
      .where(eq(habitCompletionsTable.habit_id, input.id))
      .orderBy(desc(habitCompletionsTable.completed_date))
      .execute();

    // Basic stats
    const totalCompletions = completions.length;
    const lastCompletedDate = completions.length > 0 ? completions[0].completed_date : null;

    // Calculate current streak
    let currentStreak = 0;
    if (completions.length > 0) {
      currentStreak = calculateCurrentStreak(completions, habitData.frequency);
    }

    // Calculate longest streak
    const longestStreak = calculateLongestStreak(completions, habitData.frequency);

    // Calculate completion rate
    const completionRate = calculateCompletionRate(
      completions,
      habitData.frequency,
      habitData.created_at
    );

    return {
      habit_id: input.id,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completed_date: lastCompletedDate,
      total_completions: totalCompletions,
      completion_rate: completionRate
    };
  } catch (error) {
    console.error('Failed to get habit progress:', error);
    throw error;
  }
}

function calculateCurrentStreak(completions: any[], frequency: string): number {
  if (completions.length === 0) return 0;

  // Sort completions by date (oldest first for streak calculation)
  const sortedCompletions = [...completions].sort(
    (a, b) => new Date(a.completed_date).getTime() - new Date(b.completed_date).getTime()
  );

  // For daily habits, check consecutive days
  if (frequency === 'daily') {
    return calculateDailyStreak(sortedCompletions);
  }

  // For weekly habits, check consecutive weeks
  if (frequency === 'weekly') {
    return calculateWeeklyStreak(sortedCompletions);
  }

  // For specific day habits (monday, tuesday, etc.), check consecutive occurrences of that day
  return calculateSpecificDayStreak(sortedCompletions, frequency);
}

function calculateDailyStreak(completions: any[]): number {
  if (completions.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  // Work backwards from today
  for (let i = 0; i <= completions.length; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const hasCompletion = completions.some(c => 
      new Date(c.completed_date).toISOString().split('T')[0] === dateStr
    );

    if (hasCompletion) {
      streak++;
    } else if (i > 0) { // Don't break on the first day (today) if not completed
      break;
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

function calculateWeeklyStreak(completions: any[]): number {
  if (completions.length === 0) return 0;

  const today = new Date();
  const completionWeeks = completions.map(c => {
    const date = new Date(c.completed_date);
    return getWeekNumber(date);
  });

  // Remove duplicates and sort
  const uniqueWeeks = [...new Set(completionWeeks)].sort((a, b) => b - a);

  let streak = 0;
  const currentWeek = getWeekNumber(today);

  for (let i = 0; i < uniqueWeeks.length; i++) {
    const expectedWeek = currentWeek - i;
    if (uniqueWeeks[i] === expectedWeek) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function calculateSpecificDayStreak(completions: any[], dayName: string): number {
  if (completions.length === 0) return 0;

  const dayMap: { [key: string]: number } = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };

  const targetDay = dayMap[dayName];
  const today = new Date();

  // Filter completions to only the target day
  const dayCompletions = completions.filter(c => {
    const completionDate = new Date(c.completed_date);
    return completionDate.getDay() === targetDay;
  });

  if (dayCompletions.length === 0) return 0;

  // Sort by date (most recent first)
  dayCompletions.sort((a, b) => 
    new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime()
  );

  let streak = 0;
  let currentDate = new Date(today);

  // Find the most recent target day
  while (currentDate.getDay() !== targetDay) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Count consecutive weeks with completions
  for (let i = 0; i < dayCompletions.length; i++) {
    const expectedDateStr = currentDate.toISOString().split('T')[0];
    const completionDateStr = new Date(dayCompletions[i].completed_date)
      .toISOString().split('T')[0];

    if (completionDateStr === expectedDateStr) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 7); // Go back one week
    } else {
      break;
    }
  }

  return streak;
}

function calculateLongestStreak(completions: any[], frequency: string): number {
  if (completions.length === 0) return 0;

  // Sort completions by date (oldest first)
  const sortedCompletions = [...completions].sort(
    (a, b) => new Date(a.completed_date).getTime() - new Date(b.completed_date).getTime()
  );

  if (frequency === 'daily') {
    return calculateLongestDailyStreak(sortedCompletions);
  }

  if (frequency === 'weekly') {
    return calculateLongestWeeklyStreak(sortedCompletions);
  }

  return calculateLongestSpecificDayStreak(sortedCompletions, frequency);
}

function calculateLongestDailyStreak(completions: any[]): number {
  if (completions.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  for (const completion of completions) {
    const currentDate = new Date(completion.completed_date);
    currentDate.setHours(0, 0, 0, 0);

    if (lastDate === null) {
      currentStreak = 1;
    } else {
      const daysDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        currentStreak++;
      } else if (daysDiff === 0) {
        // Same day, don't increment
        continue;
      } else {
        currentStreak = 1; // Reset streak
      }
    }

    maxStreak = Math.max(maxStreak, currentStreak);
    lastDate = currentDate;
  }

  return maxStreak;
}

function calculateLongestWeeklyStreak(completions: any[]): number {
  if (completions.length === 0) return 0;

  const completionWeeks = completions.map(c => getWeekNumber(new Date(c.completed_date)));
  const uniqueWeeks = [...new Set(completionWeeks)].sort((a, b) => a - b);

  let maxStreak = 0;
  let currentStreak = 0;
  let lastWeek: number | null = null;

  for (const week of uniqueWeeks) {
    if (lastWeek === null || week === lastWeek + 1) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }

    maxStreak = Math.max(maxStreak, currentStreak);
    lastWeek = week;
  }

  return maxStreak;
}

function calculateLongestSpecificDayStreak(completions: any[], dayName: string): number {
  const dayMap: { [key: string]: number } = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };

  const targetDay = dayMap[dayName];
  
  // Filter to only target day completions
  const dayCompletions = completions
    .filter(c => new Date(c.completed_date).getDay() === targetDay)
    .sort((a, b) => new Date(a.completed_date).getTime() - new Date(b.completed_date).getTime());

  if (dayCompletions.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 0;
  let lastWeek: number | null = null;

  for (const completion of dayCompletions) {
    const completionDate = new Date(completion.completed_date);
    const week = getWeekNumber(completionDate);

    if (lastWeek === null || week === lastWeek + 1) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }

    maxStreak = Math.max(maxStreak, currentStreak);
    lastWeek = week;
  }

  return maxStreak;
}

function calculateCompletionRate(
  completions: any[],
  frequency: string,
  createdAt: Date
): number {
  if (completions.length === 0) return 0;

  const now = new Date();
  const created = new Date(createdAt);
  
  let expectedCompletions = 0;

  if (frequency === 'daily') {
    const daysDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    expectedCompletions = Math.max(daysDiff, 1);
  } else if (frequency === 'weekly') {
    const weeksDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
    expectedCompletions = Math.max(weeksDiff, 1);
  } else {
    // For specific days (monday, tuesday, etc.)
    const dayMap: { [key: string]: number } = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    const targetDay = dayMap[frequency];
    let occurrences = 0;
    const currentDate = new Date(created);
    
    while (currentDate <= now) {
      if (currentDate.getDay() === targetDay) {
        occurrences++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    expectedCompletions = Math.max(occurrences, 1);
  }

  return Math.min(completions.length / expectedCompletions, 1);
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  return Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
}