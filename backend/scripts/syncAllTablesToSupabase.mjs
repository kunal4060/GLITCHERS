import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: 'c:/Users/Admin/OneDrive/Desktop/GLICHERS/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillAllTables() {
  console.log('🚀 STARTING COMPREHENSIVE SUPABASE POPULATION & SYNC...');

  // 1. Fetch all profiles
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  if (profErr || !profiles || profiles.length === 0) {
    console.error('Failed to load profiles:', profErr);
    return;
  }
  console.log(`Found ${profiles.length} user profiles.`);

  for (const profile of profiles) {
    const userId = profile.id;
    console.log(`\n================ Processing User: ${profile.full_name} (${profile.email}) [${userId}] ================`);

    // A. Ensure Semesters & Timetables
    let semesterId = null;
    let timetableId = null;

    const { data: existingSemesters } = await supabase
      .from('semesters')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (existingSemesters && existingSemesters.length > 0) {
      semesterId = existingSemesters[0].id;
    } else {
      const semName = `Semester ${profile.semester || 3} (Academic Year 2026-27)`;
      const { data: newSem, error: semErr } = await supabase
        .from('semesters')
        .insert({
          user_id: userId,
          name: semName,
          start_date: '2026-08-01',
          end_date: '2026-12-20',
          is_active: true,
        })
        .select('id')
        .single();

      if (semErr) console.warn('  Semester insert error:', semErr.message);
      else {
        semesterId = newSem.id;
        console.log(`  ✅ Created active semester: ${semName} (${semesterId})`);
      }
    }

    const { data: existingTimetables } = await supabase
      .from('timetables')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (existingTimetables && existingTimetables.length > 0) {
      timetableId = existingTimetables[0].id;
    } else {
      const { data: newTt, error: ttErr } = await supabase
        .from('timetables')
        .insert({
          user_id: userId,
          semester_id: semesterId,
          is_active: true,
        })
        .select('id')
        .single();

      if (ttErr) console.warn('  Timetable insert error:', ttErr.message);
      else {
        timetableId = newTt.id;
        console.log(`  ✅ Created active timetable: ${timetableId}`);
      }
    }

    // B. Link Classes to Timetable and Subjects
    const { data: userClasses } = await supabase
      .from('classes')
      .select('*')
      .eq('user_id', userId);

    if (userClasses && userClasses.length > 0) {
      console.log(`  Linking ${userClasses.length} classes to timetable and subjects...`);
      // Fetch subjects for this user
      const { data: userSubjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', userId);

      const subjectMap = new Map((userSubjects || []).map((s) => [s.name.toLowerCase().trim(), s.id]));

      for (const cls of userClasses) {
        let subId = cls.subject_id;
        if (!subId && cls.subject_name) {
          subId = subjectMap.get(cls.subject_name.toLowerCase().trim()) || null;
        }

        if (!cls.timetable_id || !cls.subject_id) {
          await supabase
            .from('classes')
            .update({
              timetable_id: timetableId || cls.timetable_id,
              subject_id: subId || cls.subject_id,
            })
            .eq('id', cls.id);
        }
      }
      console.log(`  ✅ Successfully linked classes with foreign keys.`);
    }

    // C. Ensure Google Accounts record
    const { data: existingGoogle } = await supabase
      .from('google_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingGoogle) {
      const googleId = `google_${profile.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const { error: gErr } = await supabase.from('google_accounts').insert({
        user_id: userId,
        google_id: googleId,
        email: profile.email,
        gmail_connected: true,
        calendar_connected: true,
        scopes: [
          'userinfo.email',
          'userinfo.profile',
          'openid',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/calendar.events',
        ],
        access_token: `mock_access_token_${randomUUID().slice(0, 8)}`,
        refresh_token: `mock_refresh_token_${randomUUID().slice(0, 8)}`,
        token_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      if (gErr) console.warn('  Google account insert error:', gErr.message);
      else console.log(`  ✅ Created google_accounts entry for ${profile.email}`);
    }

    // D. Ensure User Preferences
    const { data: existingPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingPrefs) {
      const domain = profile.university_domain || (profile.email.includes('@') ? profile.email.split('@')[1] : 'university.edu');
      const { error: prefErr } = await supabase.from('user_preferences').insert({
        user_id: userId,
        quiet_hours_enabled: true,
        quiet_hours_start: '23:00:00',
        quiet_hours_end: '07:00:00',
        critical_bypass: true,
        floating_assistant_enabled: true,
        ai_processing_enabled: true,
        university_domain: domain,
      });
      if (prefErr) console.warn('  User preferences insert error:', prefErr.message);
      else console.log(`  ✅ Created user_preferences for ${profile.full_name}`);
    }

    // E. Ensure Onboarding State
    const { data: existingOnboarding } = await supabase
      .from('onboarding_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingOnboarding) {
      const { error: onbErr } = await supabase.from('onboarding_state').insert({
        user_id: userId,
        current_step: 'COMPLETE',
        completed_steps: [
          'GOOGLE_AUTH',
          'GOOGLE_SERVICES',
          'PROFILE',
          'ACADEMICS',
          'TIMETABLE',
          'TIMETABLE_REVIEW',
          'NOTIFICATION_SETUP',
          'FINANCE_SETUP',
          'FLOATING_ASSISTANT',
          'INITIAL_PROCESSING',
          'COMPLETE',
        ],
        is_complete: true,
        data: {
          university: profile.university,
          course: profile.course,
          semester: profile.semester,
          section: profile.section,
          cgpa: profile.cgpa,
        },
        completed_at: new Date().toISOString(),
      });
      if (onbErr) console.warn('  Onboarding state insert error:', onbErr.message);
      else console.log(`  ✅ Created onboarding_state (COMPLETE)`);
    }

    // F. Ensure Initialization Jobs
    const { data: existingJobs } = await supabase
      .from('initialization_jobs')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (!existingJobs || existingJobs.length === 0) {
      const { error: jobErr } = await supabase.from('initialization_jobs').insert({
        user_id: userId,
        status: 'COMPLETED',
        step_statuses: {
          profile: { status: 'COMPLETED', message: 'Profile created' },
          timetable: { status: 'COMPLETED', message: 'Classes organized & subjects verified' },
          calendar: { status: 'COMPLETED', message: 'Academic schedule synchronized' },
          notifications: { status: 'COMPLETED', message: 'Notification preferences active' },
          finance: { status: 'COMPLETED', message: 'Finance tracker initialized' },
          email_processing: { status: 'COMPLETED', message: 'University notice filter active' },
        },
        completed_at: new Date().toISOString(),
      });
      if (jobErr) console.warn('  Initialization job insert error:', jobErr.message);
      else console.log(`  ✅ Created initialization_jobs entry`);
    }

    // G. Ensure Notifications
    const { count: notifCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!notifCount || notifCount === 0) {
      const sampleNotifications = [
        {
          user_id: userId,
          title: 'Welcome to NEXA',
          message: 'Your student companion powered by NIA is active and synchronized.',
          type: 'SYSTEM_ALERT',
          priority: 'NORMAL',
          read: true,
          scheduled_for: new Date(Date.now() - 3600000).toISOString(),
          sent_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          user_id: userId,
          title: 'Upcoming Lecture in 15m',
          message: 'Room AB1-204: Attend on time for attendance credit.',
          type: 'CLASS_REMINDER',
          priority: 'HIGH',
          read: false,
          scheduled_for: new Date(Date.now() + 900000).toISOString(),
        },
        {
          user_id: userId,
          title: 'Monthly Budget Summary',
          message: 'Safe daily spend is set. Track your hostel & food expenses with NIA.',
          type: 'BUDGET_ALERT',
          priority: 'NORMAL',
          read: false,
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        },
        {
          user_id: userId,
          title: 'University Notice Filtered',
          message: 'New academic circular parsed: No exam schedule changes reported.',
          type: 'IMPORTANT_EMAIL',
          priority: 'NORMAL',
          read: false,
          scheduled_for: new Date().toISOString(),
        },
      ];
      const { error: notifErr } = await supabase.from('notifications').insert(sampleNotifications);
      if (notifErr) console.warn('  Notifications insert error:', notifErr.message);
      else console.log(`  ✅ Inserted ${sampleNotifications.length} notifications`);
    }

    // H. Ensure Exams
    const { count: examCount } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!examCount || examCount === 0) {
      const sampleExams = [
        {
          user_id: userId,
          subject: 'Operating Systems (CSE3001)',
          date: '2026-10-14',
          time: '10:00:00',
          room: 'Exam Hall A3',
          syllabus: 'Processes, Threads, CPU Scheduling, Deadlocks & Memory Management (Units 1-3)',
          importance: 'CRITICAL',
        },
        {
          user_id: userId,
          subject: 'Database Management Systems (CSE2004)',
          date: '2026-10-17',
          time: '14:00:00',
          room: 'Exam Hall B2',
          syllabus: 'Relational Algebra, SQL, Normalization (1NF to BCNF), Transactions & ACID',
          importance: 'CRITICAL',
        },
        {
          user_id: userId,
          subject: 'Discrete Mathematical Structures (MAT2002)',
          date: '2026-10-21',
          time: '10:00:00',
          room: 'Exam Hall C1',
          syllabus: 'Set Theory, Graph Theory, Combinatorics & Recurrence Relations',
          importance: 'HIGH',
        },
      ];
      const { error: exErr } = await supabase.from('exams').insert(sampleExams);
      if (exErr) console.warn('  Exams insert error:', exErr.message);
      else console.log(`  ✅ Inserted ${sampleExams.length} upcoming exams`);
    }

    // I. Ensure Assignments
    const { count: assignCount } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!assignCount || assignCount === 0) {
      const sampleAssignments = [
        {
          user_id: userId,
          title: 'Lab Exercise 4: Multi-threaded Matrix Multiplication',
          subject: 'Operating Systems',
          description: 'Implement POSIX pthreads matrix multiplier in C and measure speedup.',
          deadline: new Date(Date.now() + 4 * 86400000).toISOString(),
          submission_platform: 'Moodle / Canvas',
          priority: 'HIGH',
          status: 'PENDING',
        },
        {
          user_id: userId,
          title: 'Schema Normalization & ER Diagram Case Study',
          subject: 'Database Management Systems',
          description: 'Design 3NF schema for hospital management with BCNF proof.',
          deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
          submission_platform: 'Google Classroom',
          priority: 'HIGH',
          status: 'PENDING',
        },
      ];
      const { error: asErr } = await supabase.from('assignments').insert(sampleAssignments);
      if (asErr) console.warn('  Assignments insert error:', asErr.message);
      else console.log(`  ✅ Inserted ${sampleAssignments.length} course assignments`);
    }

    // J. Ensure Debts
    const { count: debtCount } = await supabase
      .from('debts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!debtCount || debtCount === 0) {
      const sampleDebts = [
        {
          user_id: userId,
          person: 'Rahul (Roommate)',
          type: 'OWES_ME',
          amount: 350.0,
          status: 'PENDING',
          paid_amount: 0,
          notes: 'Split for weekend grocery & mineral water supplies',
        },
        {
          user_id: userId,
          person: 'Aryan (Lab Partner)',
          type: 'I_OWE',
          amount: 120.0,
          status: 'PENDING',
          paid_amount: 0,
          notes: 'Project report color printing at campus Xerox shop',
        },
      ];
      const { error: dErr } = await supabase.from('debts').insert(sampleDebts);
      if (dErr) console.warn('  Debts insert error:', dErr.message);
      else console.log(`  ✅ Inserted ${sampleDebts.length} peer debts`);
    }

    // K. Ensure Task Reminders for existing tasks
    const { data: userTasks } = await supabase.from('tasks').select('*').eq('user_id', userId);
    if (userTasks && userTasks.length > 0) {
      for (const t of userTasks) {
        const { data: existingReminders } = await supabase
          .from('task_reminders')
          .select('id')
          .eq('task_id', t.id)
          .limit(1);

        if (!existingReminders || existingReminders.length === 0) {
          const reminderTime = t.due_date ? new Date(new Date(t.due_date).getTime() - 2 * 3600000).toISOString() : new Date().toISOString();
          await supabase.from('task_reminders').insert({
            task_id: t.id,
            reminder_time: reminderTime,
            is_sent: false,
          });
        }
      }
      console.log(`  ✅ Synchronized task reminders.`);
    }
  }

  console.log('\n================ FINAL VERIFICATION OF ALL SUPABASE TABLES ================');
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
    'assignments',
    'expenses',
    'debts',
    'emails',
    'notifications',
    'initialization_jobs',
  ];

  for (const table of allTables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ ${table.padEnd(22)}: ERROR (${error.message})`);
    } else {
      console.log(`✅ ${table.padEnd(22)}: ${count} rows`);
    }
  }
}

backfillAllTables();
