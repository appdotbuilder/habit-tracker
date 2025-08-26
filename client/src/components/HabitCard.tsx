import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Calendar, 
  Target, 
  Flame, 
  TrendingUp, 
  Clock,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Correct import path from components subfolder
import type { HabitWithProgress } from '../../../server/src/schema';

interface HabitCardProps {
  habit: HabitWithProgress;
  onMarkComplete: (habitId: number) => void;
}

export function HabitCard({ habit, onMarkComplete }: HabitCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleMarkComplete = async () => {
    setIsCompleting(true);
    try {
      await onMarkComplete(habit.id);
    } finally {
      setIsCompleting(false);
    }
  };

  // Format frequency display
  const getFrequencyDisplay = () => {
    const frequencyMap: Record<string, string> = {
      daily: '📅 Daily',
      weekly: '📊 Weekly',
      monday: '1️⃣ Mondays',
      tuesday: '2️⃣ Tuesdays',
      wednesday: '3️⃣ Wednesdays',
      thursday: '4️⃣ Thursdays',
      friday: '5️⃣ Fridays',
      saturday: '6️⃣ Saturdays',
      sunday: '7️⃣ Sundays'
    };
    return frequencyMap[habit.frequency] || habit.frequency;
  };

  // Check if habit was completed today
  const isCompletedToday = () => {
    if (!habit.progress.last_completed_date) return false;
    const today = new Date();
    const lastCompleted = new Date(habit.progress.last_completed_date);
    return (
      today.getDate() === lastCompleted.getDate() &&
      today.getMonth() === lastCompleted.getMonth() &&
      today.getFullYear() === lastCompleted.getFullYear()
    );
  };

  // Get the card color scheme based on habit type
  const getCardStyle = () => {
    if (habit.type === 'daily') {
      return {
        borderColor: 'border-blue-200',
        bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
        accentColor: 'text-blue-600',
        badgeVariant: 'default' as const
      };
    } else {
      return {
        borderColor: 'border-purple-200',
        bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
        accentColor: 'text-purple-600',
        badgeVariant: 'secondary' as const
      };
    }
  };

  const cardStyle = getCardStyle();
  const completedToday = isCompletedToday();
  const completionPercentage = Math.round(habit.progress.completion_rate * 100);

  return (
    <Card className={`${cardStyle.borderColor} ${cardStyle.bgColor} border-2 hover:shadow-lg transition-all duration-200 relative overflow-hidden`}>
      {/* Completion indicator overlay */}
      {completedToday && (
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px] border-t-green-500">
          <CheckCircle2 className="absolute -top-8 -right-8 w-5 h-5 text-white" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              {habit.type === 'daily' ? (
                <Calendar className={`w-5 h-5 ${cardStyle.accentColor}`} />
              ) : (
                <Target className={`w-5 h-5 ${cardStyle.accentColor}`} />
              )}
              {habit.name}
            </CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={cardStyle.badgeVariant} className="text-xs">
                {habit.type === 'daily' ? 'Daily Task' : 'Long-term Goal'}
              </Badge>
              <span className="text-sm text-gray-600">{getFrequencyDisplay()}</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit habit</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete habit</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {habit.description && (
          <p className="text-sm text-gray-600 mt-2">{habit.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className={`font-medium ${cardStyle.accentColor}`}>
              {completionPercentage}%
            </span>
          </div>
          <Progress 
            value={completionPercentage} 
            className="h-2"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <div>
              <div className="text-gray-600">Current Streak</div>
              <div className="font-semibold text-gray-900">
                {habit.progress.current_streak} days
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-gray-600">Best Streak</div>
              <div className="font-semibold text-gray-900">
                {habit.progress.longest_streak} days
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-gray-600">Total</div>
              <div className="font-semibold text-gray-900">
                {habit.progress.total_completions}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <div>
              <div className="text-gray-600">Last Done</div>
              <div className="font-semibold text-gray-900">
                {habit.progress.last_completed_date 
                  ? new Date(habit.progress.last_completed_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  : 'Never'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleMarkComplete}
          disabled={isCompleting || completedToday}
          className={`w-full ${
            completedToday 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
          }`}
          variant={completedToday ? 'default' : 'default'}
        >
          {completedToday ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Completed Today! ✨
            </>
          ) : (
            <>
              {isCompleting ? (
                'Marking Complete...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Complete
                </>
              )}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}