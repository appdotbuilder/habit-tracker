import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createHabitInputSchema,
  updateHabitInputSchema,
  markHabitCompleteInputSchema,
  getHabitByIdInputSchema,
  deleteHabitInputSchema
} from './schema';

// Import handlers
import { createHabit } from './handlers/create_habit';
import { getHabits } from './handlers/get_habits';
import { getHabitById } from './handlers/get_habit_by_id';
import { getHabitsWithProgress } from './handlers/get_habits_with_progress';
import { updateHabit } from './handlers/update_habit';
import { deleteHabit } from './handlers/delete_habit';
import { markHabitComplete } from './handlers/mark_habit_complete';
import { getHabitProgress } from './handlers/get_habit_progress';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Create a new habit
  createHabit: publicProcedure
    .input(createHabitInputSchema)
    .mutation(({ input }) => createHabit(input)),

  // Get all habits (basic info without progress)
  getHabits: publicProcedure
    .query(() => getHabits()),

  // Get all habits with progress tracking information
  getHabitsWithProgress: publicProcedure
    .query(() => getHabitsWithProgress()),

  // Get a specific habit by ID
  getHabitById: publicProcedure
    .input(getHabitByIdInputSchema)
    .query(({ input }) => getHabitById(input)),

  // Get progress information for a specific habit
  getHabitProgress: publicProcedure
    .input(getHabitByIdInputSchema)
    .query(({ input }) => getHabitProgress(input)),

  // Update an existing habit
  updateHabit: publicProcedure
    .input(updateHabitInputSchema)
    .mutation(({ input }) => updateHabit(input)),

  // Delete a habit
  deleteHabit: publicProcedure
    .input(deleteHabitInputSchema)
    .mutation(({ input }) => deleteHabit(input)),

  // Mark a habit as completed for a specific date
  markHabitComplete: publicProcedure
    .input(markHabitCompleteInputSchema)
    .mutation(({ input }) => markHabitComplete(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();