import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Admin/OneDrive/Desktop/GLICHERS/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const allTables = [
  'profiles',
  'user_preferences',
  'onboarding_state',
  'google_accounts',
  'semesters',
  'subjects',
  'timetables',
  'classes',
  'tasks',
  'task_reminders',
  'exams',
  'expenses',
  'shared_expenses',
  'expense_shares',
  'debts',
  'emails',
  'notifications',
  'device_tokens',
  'sync_records',
  'initialization_jobs'
];

async function check() {
  console.log('--- SUPABASE TABLE ROW COUNTS ---');
  for (const table of allTables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`${table}: ERROR -> ${error.message}`);
    } else {
      console.log(`${table}: ${count} rows`);
    }
  }
}

check();
