import { db } from '../db';
import { habitsTable, habitCompletionsTable } from '../db/schema';
import { type HabitWithProgress } from '../schema';
import { sql } from 'drizzle-orm';

export async function getHabitsWithProgress(): Promise<HabitWithProgress[]> {
  try {
    // Get all habits first
    const habits = await db.select().from(habitsTable).execute();
    
    if (habits.length === 0) {
      return [];
    }
    
    // For each habit, calculate progress metrics
    const habitsWithProgress: HabitWithProgress[] = [];
    
    for (const habit of habits) {
      // Get all completions for this habit, ordered by date
      const completions = await db.select()
        .from(habitCompletionsTable)
        .where(sql`habit_id = ${habit.id}`)
        .orderBy(sql`completed_date DESC`)
        .execute();
      
      // Calculate progress metrics
      const totalCompletions = completions.length;
      const lastCompletedDate = completions.length > 0 ? completions[0].completed_date : null;
      
      // Calculate streaks by checking consecutive days
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      
      if (completions.length > 0) {
        // Sort completions by date ascending for streak calculation
        const sortedCompletions = [...completions].reverse();
        const completionDates = sortedCompletions.map(c => {
          const date = new Date(c.completed_date);
          // Normalize to start of day for comparison
          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        });
        
        // Remove duplicates (same day completions)
        const uniqueDates = [...new Set(completionDates.map(d => d.getTime()))]
          .map(t => new Date(t))
          .sort((a, b) => a.getTime() - b.getTime());
        
        // Calculate current streak (from most recent date backwards)
        const today = new Date();
        const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        if (uniqueDates.length > 0) {
          const mostRecentDate = uniqueDates[uniqueDates.length - 1];
          const daysSinceLastCompletion = Math.floor(
            (todayNormalized.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Current streak is valid if last completion was today or yesterday
          if (daysSinceLastCompletion <= 1) {
            currentStreak = 1;
            
            // Count backwards for consecutive days
            for (let i = uniqueDates.length - 2; i >= 0; i--) {
              const currentDate = uniqueDates[i + 1];
              const previousDate = uniqueDates[i];
              const daysDiff = Math.floor(
                (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              
              if (daysDiff === 1) {
                currentStreak++;
              } else {
                break;
              }
            }
          }
        }
        
        // Calculate longest streak
        tempStreak = 1;
        longestStreak = 1;
        
        for (let i = 1; i < uniqueDates.length; i++) {
          const currentDate = uniqueDates[i];
          const previousDate = uniqueDates[i - 1];
          const daysDiff = Math.floor(
            (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysDiff === 1) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
          } else {
            tempStreak = 1;
          }
        }
      }
      
      // Calculate completion rate based on habit frequency and creation date
      let completionRate = 0;
      if (totalCompletions > 0) {
        const habitCreatedDate = new Date(habit.created_at);
        const currentDate = new Date();
        const daysSinceCreation = Math.floor(
          (currentDate.getTime() - habitCreatedDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1; // Add 1 to include creation day
        
        let expectedCompletions = 0;
        
        if (habit.frequency === 'daily') {
          expectedCompletions = daysSinceCreation;
        } else if (habit.frequency === 'weekly') {
          expectedCompletions = Math.ceil(daysSinceCreation / 7);
        } else {
          // For specific days of week, count how many of those days have passed
          const dayOfWeek = habit.frequency;
          const dayMap: Record<string, number> = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
          };
          
          const targetDayOfWeek = dayMap[dayOfWeek];
          let count = 0;
          const checkDate = new Date(habitCreatedDate);
          
          while (checkDate <= currentDate) {
            if (checkDate.getDay() === targetDayOfWeek) {
              count++;
            }
            checkDate.setDate(checkDate.getDate() + 1);
          }
          
          expectedCompletions = count;
        }
        
        completionRate = expectedCompletions > 0 ? Math.min(totalCompletions / expectedCompletions, 1) : 0;
      }
      
      habitsWithProgress.push({
        id: habit.id,
        name: habit.name,
        description: habit.description,
        type: habit.type as any,
        frequency: habit.frequency as any,
        created_at: habit.created_at,
        updated_at: habit.updated_at,
        progress: {
          habit_id: habit.id,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_completed_date: lastCompletedDate,
          total_completions: totalCompletions,
          completion_rate: Math.round(completionRate * 1000) / 1000 // Round to 3 decimal places
        }
      });
    }
    
    return habitsWithProgress;
  } catch (error) {
    console.error('Failed to get habits with progress:', error);
    throw error;
  }
}