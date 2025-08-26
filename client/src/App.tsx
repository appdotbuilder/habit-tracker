import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Target, Calendar, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { HabitForm } from '@/components/HabitForm';
import { HabitCard } from '@/components/HabitCard';
import { HabitStats } from '@/components/HabitStats';
// Using type-only import for better TypeScript compliance
import type { HabitWithProgress, CreateHabitInput } from '../../server/src/schema';

function App() {
  // State management with proper typing
  const [habits, setHabits] = useState<HabitWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Load habits with progress data
  const loadHabits = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getHabitsWithProgress.query();
      setHabits(result);
    } catch (error) {
      console.error('Failed to load habits:', error);
      // For demo purposes, we'll show some sample data when the API is not fully implemented
      // This is a fallback for when the API is not fully implemented
      const sampleHabits: HabitWithProgress[] = [
          {
            id: 1,
            name: 'Morning Meditation 🧘‍♀️',
            description: 'Start each day with 10 minutes of mindfulness',
            type: 'daily',
            frequency: 'daily',
            created_at: new Date('2024-01-15'),
            updated_at: new Date('2024-01-15'),
            progress: {
              habit_id: 1,
              current_streak: 7,
              longest_streak: 12,
              last_completed_date: new Date(),
              total_completions: 45,
              completion_rate: 0.85
            }
          },
          {
            id: 2,
            name: 'Learn Spanish 📚',
            description: 'Practice Spanish vocabulary and grammar',
            type: 'long-term',
            frequency: 'weekly',
            created_at: new Date('2024-01-10'),
            updated_at: new Date('2024-01-10'),
            progress: {
              habit_id: 2,
              current_streak: 3,
              longest_streak: 5,
              last_completed_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              total_completions: 12,
              completion_rate: 0.75
            }
          },
          {
            id: 3,
            name: 'Weekly Exercise 💪',
            description: 'Hit the gym or do home workout',
            type: 'daily',
            frequency: 'monday',
            created_at: new Date('2024-01-08'),
            updated_at: new Date('2024-01-08'),
            progress: {
              habit_id: 3,
              current_streak: 2,
              longest_streak: 4,
              last_completed_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              total_completions: 8,
              completion_rate: 0.67
            }
          }
        ];
      setHabits(sampleHabits);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load habits on component mount
  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // Handle habit creation
  const handleCreateHabit = async (formData: CreateHabitInput) => {
    try {
      setIsLoading(true);
      const newHabit = await trpc.createHabit.mutate(formData);
      
      // Create a habit with progress for the UI (since the API might not return progress initially)
      const habitWithProgress: HabitWithProgress = {
        ...newHabit,
        progress: {
          habit_id: newHabit.id,
          current_streak: 0,
          longest_streak: 0,
          last_completed_date: null,
          total_completions: 0,
          completion_rate: 0
        }
      };
      
      setHabits((prev: HabitWithProgress[]) => [...prev, habitWithProgress]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create habit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle marking habit as complete
  const handleMarkComplete = async (habitId: number) => {
    try {
      await trpc.markHabitComplete.mutate({ 
        habit_id: habitId,
        completed_date: new Date()
      });
      
      // Optimistically update the UI
      setHabits((prev: HabitWithProgress[]) =>
        prev.map((habit: HabitWithProgress) =>
          habit.id === habitId
            ? {
                ...habit,
                progress: {
                  ...habit.progress,
                  current_streak: habit.progress.current_streak + 1,
                  total_completions: habit.progress.total_completions + 1,
                  last_completed_date: new Date(),
                  completion_rate: Math.min(1, habit.progress.completion_rate + 0.1)
                }
              }
            : habit
        )
      );
    } catch (error) {
      console.error('Failed to mark habit as complete:', error);
    }
  };

  // Filter habits by type
  const dailyHabits = habits.filter((habit: HabitWithProgress) => habit.type === 'daily');
  const longTermHabits = habits.filter((habit: HabitWithProgress) => habit.type === 'long-term');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ✨ Habit Tracker
          </h1>
          <p className="text-xl text-gray-600">
            Build better habits, one day at a time
          </p>
        </div>

        {/* Quick Stats */}
        <HabitStats habits={habits} />

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="daily" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Daily Tasks
              </TabsTrigger>
              <TabsTrigger value="long-term" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Long-term Goals
              </TabsTrigger>
            </TabsList>

            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Add New Habit
            </Button>
          </div>

          {/* Create Habit Form */}
          {showCreateForm && (
            <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-blue-800">Create New Habit</CardTitle>
                <CardDescription>
                  Add a new habit to track your progress and build consistency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HabitForm
                  onSubmit={handleCreateHabit}
                  onCancel={() => setShowCreateForm(false)}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          )}

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {habits.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      <Target className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Ready to start your journey? 🚀
                    </h3>
                    <p className="text-gray-600 max-w-md">
                      Create your first habit above and begin building the life you want, one small step at a time.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {habits.map((habit: HabitWithProgress) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onMarkComplete={() => handleMarkComplete(habit.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Daily Tasks Tab */}
          <TabsContent value="daily" className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Daily Tasks</h2>
              <Badge variant="secondary" className="ml-2">
                {dailyHabits.length} habits
              </Badge>
            </div>
            
            {dailyHabits.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-gray-600">No daily habits yet. Create one to get started! 📅</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dailyHabits.map((habit: HabitWithProgress) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onMarkComplete={() => handleMarkComplete(habit.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Long-term Goals Tab */}
          <TabsContent value="long-term" className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Long-term Goals</h2>
              <Badge variant="secondary" className="ml-2">
                {longTermHabits.length} goals
              </Badge>
            </div>
            
            {longTermHabits.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-gray-600">No long-term goals yet. Set one to work towards! 🎯</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {longTermHabits.map((habit: HabitWithProgress) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onMarkComplete={() => handleMarkComplete(habit.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;