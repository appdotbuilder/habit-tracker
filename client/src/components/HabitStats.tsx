import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  Flame, 
  CheckCircle2,
  Award
} from 'lucide-react';
// Correct import path from components subfolder
import type { HabitWithProgress } from '../../../server/src/schema';

interface HabitStatsProps {
  habits: HabitWithProgress[];
}

export function HabitStats({ habits }: HabitStatsProps) {
  // Calculate overall statistics
  const totalHabits = habits.length;
  const dailyHabits = habits.filter((habit: HabitWithProgress) => habit.type === 'daily').length;
  const longTermHabits = habits.filter((habit: HabitWithProgress) => habit.type === 'long-term').length;
  
  // Check habits completed today
  const habitsCompletedToday = habits.filter((habit: HabitWithProgress) => {
    if (!habit.progress.last_completed_date) return false;
    const today = new Date();
    const lastCompleted = new Date(habit.progress.last_completed_date);
    return (
      today.getDate() === lastCompleted.getDate() &&
      today.getMonth() === lastCompleted.getMonth() &&
      today.getFullYear() === lastCompleted.getFullYear()
    );
  }).length;

  // Calculate average completion rate
  const averageCompletionRate = habits.length > 0 
    ? Math.round(
        habits.reduce((sum: number, habit: HabitWithProgress) => sum + habit.progress.completion_rate, 0) / habits.length * 100
      )
    : 0;

  // Find longest current streak
  const longestCurrentStreak = habits.length > 0 
    ? Math.max(...habits.map((habit: HabitWithProgress) => habit.progress.current_streak))
    : 0;

  // Calculate total completions
  const totalCompletions = habits.reduce((sum: number, habit: HabitWithProgress) => 
    sum + habit.progress.total_completions, 0
  );

  // Don't render if no habits
  if (totalHabits === 0) {
    return null;
  }

  const statCards = [
    {
      icon: Target,
      label: 'Total Habits',
      value: totalHabits.toString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      icon: CheckCircle2,
      label: 'Completed Today',
      value: `${habitsCompletedToday}/${totalHabits}`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      icon: TrendingUp,
      label: 'Avg. Success Rate',
      value: `${averageCompletionRate}%`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      icon: Flame,
      label: 'Best Streak',
      value: `${longestCurrentStreak} days`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ];

  return (
    <div className="mb-8">
      {/* Quick Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <Card key={index} className={`${stat.borderColor} border-2 ${stat.bgColor} hover:shadow-md transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${stat.bgColor} border ${stat.borderColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Banner */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="p-3 bg-white/20 rounded-full">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Your Progress Summary</h3>
                <p className="text-blue-100">
                  {totalCompletions > 0 
                    ? `Amazing! You've completed ${totalCompletions} habit${totalCompletions !== 1 ? 's' : ''} so far! 🎉`
                    : 'Ready to start building great habits? 💪'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Calendar className="w-3 h-3 mr-1" />
                  {dailyHabits} Daily
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Target className="w-3 h-3 mr-1" />
                  {longTermHabits} Goals
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}