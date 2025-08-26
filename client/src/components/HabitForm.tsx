import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Target, Clock } from 'lucide-react';
// Correct import path from components subfolder
import type { CreateHabitInput, HabitType, Frequency } from '../../../server/src/schema';

interface HabitFormProps {
  onSubmit: (data: CreateHabitInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function HabitForm({ onSubmit, onCancel, isLoading = false }: HabitFormProps) {
  const [formData, setFormData] = useState<CreateHabitInput>({
    name: '',
    description: null,
    type: 'daily',
    frequency: 'daily'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    // Reset form after successful submission
    setFormData({
      name: '',
      description: null,
      type: 'daily',
      frequency: 'daily'
    });
  };

  const handleTypeChange = (value: HabitType) => {
    setFormData((prev: CreateHabitInput) => ({
      ...prev,
      type: value,
      // Reset frequency to default when changing type
      frequency: value === 'daily' ? 'daily' : 'weekly'
    }));
  };

  const handleFrequencyChange = (value: Frequency) => {
    setFormData((prev: CreateHabitInput) => ({
      ...prev,
      frequency: value
    }));
  };

  // Frequency options based on habit type
  const getFrequencyOptions = () => {
    if (formData.type === 'daily') {
      return [
        { value: 'daily', label: 'Every day', icon: '📅' },
        { value: 'monday', label: 'Mondays', icon: '1️⃣' },
        { value: 'tuesday', label: 'Tuesdays', icon: '2️⃣' },
        { value: 'wednesday', label: 'Wednesdays', icon: '3️⃣' },
        { value: 'thursday', label: 'Thursdays', icon: '4️⃣' },
        { value: 'friday', label: 'Fridays', icon: '5️⃣' },
        { value: 'saturday', label: 'Saturdays', icon: '6️⃣' },
        { value: 'sunday', label: 'Sundays', icon: '7️⃣' }
      ];
    } else {
      return [
        { value: 'daily', label: 'Daily progress', icon: '📅' },
        { value: 'weekly', label: 'Weekly goals', icon: '📊' }
      ];
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Habit Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
          Habit Name *
        </Label>
        <Input
          id="name"
          placeholder="e.g., Morning meditation, Read for 30 minutes"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateHabitInput) => ({ ...prev, name: e.target.value }))
          }
          className="text-base"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
          Description (Optional)
        </Label>
        <Textarea
          id="description"
          placeholder="Add some details about your habit or why it's important to you..."
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateHabitInput) => ({
              ...prev,
              description: e.target.value || null
            }))
          }
          className="text-base min-h-20"
          rows={3}
        />
      </div>

      {/* Habit Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700">Habit Type *</Label>
        <RadioGroup
          value={formData.type}
          onValueChange={handleTypeChange}
          className="grid grid-cols-2 gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="daily" id="daily" />
            <Label htmlFor="daily" className="cursor-pointer">
              <Card className="p-4 hover:shadow-md transition-shadow">
                <CardContent className="p-0 flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Daily Task</div>
                    <div className="text-sm text-gray-500">Regular activities</div>
                  </div>
                </CardContent>
              </Card>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="long-term" id="long-term" />
            <Label htmlFor="long-term" className="cursor-pointer">
              <Card className="p-4 hover:shadow-md transition-shadow">
                <CardContent className="p-0 flex items-center space-x-3">
                  <Target className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-medium">Long-term Goal</div>
                    <div className="text-sm text-gray-500">Big objectives</div>
                  </div>
                </CardContent>
              </Card>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Frequency *
        </Label>
        <Select value={formData.frequency} onValueChange={handleFrequencyChange}>
          <SelectTrigger className="text-base">
            <SelectValue placeholder="Choose frequency" />
          </SelectTrigger>
          <SelectContent>
            {getFrequencyOptions().map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isLoading || !formData.name.trim()}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isLoading ? 'Creating...' : '✨ Create Habit'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="px-8"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}