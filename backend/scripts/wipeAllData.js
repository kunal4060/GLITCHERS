import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function wipeAllData() {
  console.log('--- STARTING COMPLETE DATABASE WIPE ---');

  const tables = [
    'ai_messages',
    'ai_conversations',
    'emails',
    'debts',
    'expenses',
    'tasks',
    'classes',
    'budgets',
    'google_accounts',
    'profiles',
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // matches all rows

      if (error) {
        console.warn(`Warning on table "${table}":`, error.message);
      } else {
        console.log(`✓ Table "${table}" wiped: ${count ?? 0} rows deleted.`);
      }
    } catch (err) {
      console.error(`Failed on table "${table}":`, err.message);
    }
  }

  console.log('--- DATABASE WIPE COMPLETE ---');
}

wipeAllData();
