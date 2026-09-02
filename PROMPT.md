You are a senior full-stack mobile architect, React Native engineer, Android/Kotlin engineer, backend engineer, database architect, AI engineer, DevOps engineer, QA engineer, UI/UX designer, and security engineer.

Your job is to DESIGN, IMPLEMENT, TEST, DEBUG, REVIEW, AND FINISH a production-quality MVP of the following application.

Do not merely generate mockups, pseudocode, placeholder screens, fake API calls, fake database responses, or non-functional buttons.

The final result must be a REAL WORKING APPLICATION with:

- Working React Native mobile frontend
- Working Android native integration
- Working backend API
- Working PostgreSQL database
- Working authentication
- Working Google OAuth
- Working Gmail integration
- Working Google Calendar integration
- Working Gemini AI integration
- Working task system
- Working finance system
- Working borrow/lend system
- Working timetable extraction
- Working notifications
- Working Android floating assistant
- Working offline/cache behavior
- Working synchronization
- Proper validation
- Security
- Error handling
- Automated tests
- Deployment configuration
- Documentation

Do not stop after generating code.

You must repeatedly inspect, run, test, identify problems, fix them, retest, and continue until the EXIT CONDITION is satisfied.

====================================================================
1. PRODUCT CONTEXT
====================================================================

PRODUCT NAME:
AI Student Life Companion

CORE PRODUCT IDEA:

Build a mobile-first AI-powered student assistant that reduces the student's mental load by combining university communication, timetable, calendar, tasks, finances, borrowing/lending, reminders, documents, and AI assistance in one application.

The central philosophy is:

"Students should not have to manually organize everything. The system should understand information, convert it into structured actions, connect those actions to the correct part of student life, and remind the student at the right time."

The app has two major experiences:

1. FULL MOBILE APP
2. ANDROID FLOATING STUDENT ASSISTANT

The app is Android-first because the floating system-wide assistant requires Android-specific capabilities.

iOS support may be prepared architecturally but MUST NOT compromise the Android MVP.

====================================================================
2. CORE PRODUCT PRINCIPLE
====================================================================

The entire application should follow this transformation:

UNSTRUCTURED INFORMATION
        ↓
AI UNDERSTANDING
        ↓
STRUCTURED DATA
        ↓
VALIDATION
        ↓
DATABASE
        ↓
ACTIONS
        ↓
CALENDAR / TASKS / FINANCE / NOTIFICATIONS
        ↓
STUDENT ASSISTANT

Examples:

University email
        ↓
Gemini
        ↓
Summary + deadline + schedule change
        ↓
Validation
        ↓
Task / Calendar / Notification

Natural language expense
        ↓
Gemini
        ↓
Structured expense JSON
        ↓
Validation
        ↓
Supabase

Timetable image/PDF
        ↓
AI extraction
        ↓
Structured classes
        ↓
Validation
        ↓
Calendar + reminder scheduler

Student request
        ↓
AI router
        ↓
Tool/function call
        ↓
Backend
        ↓
Supabase query/action
        ↓
Gemini natural-language answer

====================================================================
3. MANDATORY TECHNOLOGY STACK
====================================================================

Do NOT replace the following technologies without a compelling technical reason.

MOBILE:

- React Native
- TypeScript
- Expo with Development Build
- React Navigation
- Zustand
- TanStack Query
- NativeWind
- React Native Reanimated
- React Native Gesture Handler

BACKEND:

- Node.js
- TypeScript
- Fastify
- Render

DATABASE/BACKEND SERVICES:

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- Row Level Security (RLS)

AI:

- Google Gemini API
- Structured JSON outputs
- Function/tool calling
- Multimodal capabilities where appropriate

GOOGLE:

- Google OAuth
- Gmail API
- Google Calendar API

ANDROID:

- Kotlin
- Android WindowManager
- Android native module / React Native bridge
- Overlay permission
- Foreground-service mechanisms ONLY where required and appropriate
- Android notifications

NOTIFICATIONS:

- Local notifications
- Push notifications
- Notification scheduler

DEVELOPMENT:

- Git
- GitHub
- Figma-compatible design process
- Android Studio
- VS Code
- Postman or equivalent API testing

TESTING:

- React Native/Expo tests
- Jest
- Integration testing
- API tests
- Backend tests
- Database tests
- AI extraction evaluation tests

====================================================================
4. HOSTING / DEPLOYMENT
====================================================================

Use this deployment strategy:

MOBILE:
Android APK/AAB built with Expo/EAS tooling as appropriate.

BACKEND:
Render

DATABASE:
Supabase PostgreSQL

AUTH:
Supabase Auth + Google OAuth configuration

FILE STORAGE:
Supabase Storage

AI:
Gemini API

GOOGLE SERVICES:
Gmail API
Google Calendar API

SOURCE CONTROL:
GitHub

DO NOT host the database on Render if Supabase is already being used.

DO NOT expose Gemini API keys in the mobile application.

DO NOT expose Google client secrets in the mobile application.

Secrets MUST remain server-side.

Use environment variables.

====================================================================
5. ONE GOOGLE ACCOUNT ARCHITECTURE
====================================================================

The application uses Google as the primary and only login mechanism for the MVP.

The student taps:

"Continue with Google"

The Google account provides the student's identity.

The same Google account can also provide authorized access to:

- Gmail
- Google Calendar

Important distinction:

Google LOGIN identifies the user.

Google API permissions authorize access to Gmail and Calendar.

Do NOT treat login permission as automatic permission to read Gmail.

The student must explicitly authorize required Google scopes.

Do NOT ask for or store the student's Google password.

====================================================================
6. FIRST-TIME USER FLOW
====================================================================

Implement this onboarding flow:

Welcome
    ↓
Continue with Google
    ↓
Google Authentication
    ↓
Create/link Supabase user
    ↓
Explain Gmail permissions
    ↓
Request required Gmail permission
    ↓
Explain Google Calendar permissions
    ↓
Request required Calendar permission
    ↓
University selection/profile setup
    ↓
Upload timetable
    ↓
AI timetable processing
    ↓
Review extracted classes
    ↓
Confirm timetable
    ↓
Set class reminder
    ↓
Set task reminder preferences
    ↓
Set quiet hours
    ↓
Set monthly budget
    ↓
Request Android notification permission
    ↓
Offer floating assistant permission
    ↓
Dashboard

Do not overwhelm the user with every permission simultaneously.

Explain WHY each permission is needed before asking.

====================================================================
7. FULL APP MODULES
====================================================================

The application must contain these core modules.

1. Dashboard
2. AI Chat
3. Email
4. Timetable
5. Calendar
6. Tasks
7. Exams
8. Assignments
9. Finance
10. Budgets
11. Borrow/Lend
12. Shared Expenses
13. Documents
14. Notifications
15. Search
16. Profile
17. Settings
18. Privacy & Security
19. Floating Assistant

====================================================================
8. DASHBOARD
====================================================================

The dashboard must answer:

"What do I need to know right now?"

Show:

- Greeting
- Next class
- Time remaining
- Today's classes
- Today's tasks
- Upcoming deadlines
- Important emails
- Today's spending
- Monthly spending
- Current balance
- Money to receive
- Money to pay
- Important notifications

Do not make the dashboard merely a collection of navigation buttons.

It should be information-first.

Example:

Good Morning

NEXT CLASS
DBMS
10:00–11:00
AB1-204
Starts in 18 minutes

TODAY
4 Classes
2 Tasks
1 Important Email

UPCOMING
AI Assignment
Due Tomorrow

FINANCE
₹6,320 spent this month
₹3,680 remaining

MONEY
₹700 to receive
₹200 to pay

====================================================================
9. GMAIL / UNIVERSITY EMAIL SYSTEM
====================================================================

The app ONLY uses Google Gmail for email integration.

Use:

Google OAuth
+
Gmail API

Do NOT implement Microsoft Graph.

Email architecture:

Google
 ↓
Gmail API
 ↓
Render Backend
 ↓
University relevance filter
 ↓
Gemini
 ↓
Structured result
 ↓
Validation
 ↓
Supabase
 ↓
Notification / Task / Calendar actions

The app should identify university-related emails using:

- University domain
- Known faculty addresses
- University mailing lists
- Known university sender patterns
- User-configured trusted senders/domains

Do not automatically process every personal email unnecessarily.

Support a configurable university-domain field.

Example:

@university.edu

or the configured university domain.

====================================================================
10. EMAIL PROCESSING
====================================================================

Gemini should identify:

- Summary
- Importance
- Dates
- Deadlines
- Schedule changes
- Room changes
- Assignment announcements
- Exam announcements
- Events
- Action items
- Registration deadlines

Example output:

{
  "type": "SCHEDULE_CHANGE",
  "summary": "OS Lab moved from 2 PM to 4 PM.",
  "importance": "HIGH",
  "action_required": true,
  "subject": "Operating Systems",
  "old_datetime": "...",
  "new_datetime": "...",
  "room": "AB2-301"
}

Use strict schema validation.

Never allow the AI to invent unavailable information.

If information is unknown:

null

NOT fabricated.

====================================================================
11. EMAIL STORAGE POLICY
====================================================================

Prefer storing:

- Provider message ID
- Sender
- Subject
- Summary
- Importance
- Received timestamp
- Processing status
- Extracted actions
- Extracted dates
- References to related tasks/events

Do NOT unnecessarily store full email contents permanently.

If full email storage is needed for a feature, make the data retention behavior explicit and privacy-conscious.

Provide controls for disconnecting Gmail.

Handle expired/revoked OAuth authorization.

====================================================================
12. EMAIL SYNC SYSTEM
====================================================================

Implement a robust email synchronization architecture.

MVP may use periodic synchronization if necessary.

Production architecture should use Google's supported push/watch mechanisms where appropriate.

Do not make one continuous polling loop per user.

Create:

emailSync service
emailProcessing service
background job processing
deduplication logic

Each Gmail message must not be processed repeatedly.

Use provider message IDs and processing records to ensure idempotency.

====================================================================
13. TIMETABLE ANALYZER
====================================================================

The student can upload:

- PNG
- JPG
- PDF
- Spreadsheet where practical

Pipeline:

Upload
 ↓
Supabase Storage
 ↓
Render backend
 ↓
PDF/text extraction or multimodal AI
 ↓
Gemini
 ↓
Structured timetable JSON
 ↓
Validation
 ↓
User review
 ↓
Supabase
 ↓
Calendar events
 ↓
Reminder scheduler

Extract:

- Subject
- Day
- Start time
- End time
- Faculty
- Room
- Class type

The student MUST be able to review/edit extracted timetable data before final confirmation.

Do not blindly create calendar events from unverified AI extraction.

====================================================================
14. TIMETABLE CONFLICT DETECTION
====================================================================

Detect:

- Overlapping classes
- Duplicate entries
- Invalid times
- Missing essential fields
- Exam/class conflicts

Example:

DBMS 10:00–11:00
AI 10:30–11:30

Show:

"Schedule conflict detected."

Allow the student to resolve/edit it.

====================================================================
15. SUBJECT SYSTEM
====================================================================

Create a canonical subject entity.

Example:

subject:
- id
- name
- short_name
- code
- faculty
- semester_id

Map:

"Database Management Systems"
"DBMS"

to the same subject where appropriate.

Do NOT create duplicate independent subjects unnecessarily.

====================================================================
16. ACADEMIC STRUCTURE
====================================================================

Support:

- University
- Course
- Year
- Semester
- Section
- Subjects

Future features must be able to associate records with the academic structure.

====================================================================
17. CALENDAR
====================================================================

Build an internal calendar.

Data can come from:

- Timetable
- University emails
- Exams
- Assignments
- Tasks
- Manual events

Also support Google Calendar integration where permissions are granted.

Calendar entries need:

- Title
- Start time
- End time
- Location
- Source
- Subject
- Recurrence where applicable
- Reminder configuration

Do not duplicate calendar events unnecessarily.

Use stable IDs and provider IDs.

====================================================================
18. RECURRING CLASSES
====================================================================

Timetable classes are recurring structures.

Example:

Monday
10:00–11:00
DBMS
Weekly

Do not manually create a separate independent class record for every future date unless technically necessary.

Use recurrence representation and generate/synchronize events carefully.

====================================================================
19. TASK MANAGER
====================================================================

Support natural language task creation.

Example:

"Complete my AI assignment by Friday. It is extremely important."

AI output:

{
  "intent": "CREATE_TASK",
  "title": "Complete AI assignment",
  "deadline": "...",
  "priority": "EXTREMELY_IMPORTANT"
}

Task fields:

- ID
- User ID
- Title
- Description
- Priority
- Due date
- Status
- Created date
- Completed date
- Recurrence
- Related subject
- Related email
- Related assignment
- Reminder configuration

Statuses:

- TODO
- IN_PROGRESS
- COMPLETED
- CANCELLED

Priorities:

- LOW
- NORMAL
- HIGH
- EXTREMELY_IMPORTANT

====================================================================
20. SMART TASK REMINDERS
====================================================================

Reminder engine depends on:

- Deadline
- Priority
- User preference
- Current time
- Quiet hours

Example:

EXTREMELY_IMPORTANT:
7 days
3 days
1 day
3 hours
30 minutes

IMPORTANT:
2 days
1 day

NORMAL:
1 day

LOW:
deadline

Make reminder rules configurable.

Do not hardcode all reminder behavior into UI components.

Create a central reminder engine.

====================================================================
21. RECURRING TASKS
====================================================================

Support:

- Daily
- Weekly
- Monthly
- Custom recurrence

Example:

"Study DBMS every Monday at 7 PM."

Store recurrence rules explicitly.

====================================================================
22. EXAMS
====================================================================

Create a dedicated Exam entity.

Fields:

- Subject
- Date
- Time
- Room
- Syllabus/reference
- Importance
- Source
- Related email

Exam reminders should have stronger priority.

====================================================================
23. ASSIGNMENTS
====================================================================

Create a dedicated Assignment entity.

Fields:

- Title
- Subject
- Description
- Deadline
- Submission platform
- Priority
- Status
- Related email
- Related document

Assignment can create a task automatically, but task and assignment remain separate concepts.

====================================================================
24. FINANCE TRACKER
====================================================================

Students can enter expenses using natural language.

Example:

"Spent ₹180 on dinner at Domino's."

Gemini produces:

{
  "intent": "ADD_EXPENSE",
  "amount": 180,
  "category": "FOOD",
  "merchant": "Domino's",
  "description": "Dinner",
  "date": "..."
}

Backend validates.

Then insert into Supabase.

Do NOT let Gemini write directly to the database.

====================================================================
25. FINANCE TRANSACTION TYPES
====================================================================

Support:

- EXPENSE
- INCOME
- REFUND
- BORROW
- LEND
- TRANSFER

Do not represent all financial activity with one ambiguous transaction type.

====================================================================
26. EXPENSE CATEGORIES
====================================================================

Provide:

- Food
- Transport
- Education
- Shopping
- Entertainment
- Hostel
- Bills
- Groceries
- Other

Allow custom categories where practical.

====================================================================
27. BALANCE SYSTEM
====================================================================

For MVP use manually tracked money.

Support future expansion to:

- Cash
- Bank
- UPI
- Wallet
- Other

Do NOT attempt bank/UPI integration in the MVP.

Balance calculations must be deterministic.

Do NOT ask Gemini to calculate financial balances from raw conversation history.

Calculate balances in application code/database queries.

====================================================================
28. BUDGET SYSTEM
====================================================================

Support:

Monthly budget

Example:

₹10,000/month

Category budgets:

Food ₹3,000
Transport ₹1,500
Entertainment ₹1,000

Configurable alerts:

75%
90%
100%

Use deterministic calculations.

Gemini can generate insights based on calculated values.

====================================================================
29. FINANCE ANALYTICS
====================================================================

Dashboard should show:

- Daily spending
- Weekly spending
- Monthly spending
- Category breakdown
- Largest expense
- Average daily spending
- Budget utilization
- Remaining budget
- Spending trend
- Money to receive
- Money to pay

Use a React Native charting library.

Do not use AI for simple arithmetic.

====================================================================
30. BORROW / LEND
====================================================================

Student:

"Rahul borrowed ₹500 from me."

Create:

Person = Rahul
Type = OWES_ME
Amount = ₹500
Status = PENDING

Student:

"I borrowed ₹200 from Aman."

Create:

Person = Aman
Type = I_OWE
Amount = ₹200
Status = PENDING

Support:

- Paid
- Pending
- Partially paid
- Due date
- Notes

====================================================================
31. SHARED EXPENSES
====================================================================

Support:

"Dinner was ₹900 and three people split it equally."

Calculate:

₹900 / 3 = ₹300

Create appropriate shares/debt relationships.

Support future uneven splitting.

====================================================================
32. FINANCE CORRECTION
====================================================================

Users must be able to:

- Edit expense
- Delete expense
- Undo expense
- Add refund
- Split expense
- Mark reimbursement
- Correct category
- Correct amount

AI-created records are NOT immutable.

====================================================================
33. CENTRAL AI CHATBOT
====================================================================

The chatbot is the main natural language interface.

Examples:

"What classes do I have tomorrow?"

"How much did I spend this month?"

"What assignments are due?"

"Did the university send anything important?"

"How much does Rahul owe me?"

"Add my ML assignment for Friday."

"When is my next class?"

The chatbot MUST retrieve real data from Supabase.

It must not fabricate user-specific information.

====================================================================
34. AI ROUTER
====================================================================

Implement an AI orchestration/router layer.

Possible intents:

- GENERAL_QUERY
- GET_SCHEDULE
- GET_TASKS
- CREATE_TASK
- UPDATE_TASK
- COMPLETE_TASK
- GET_EXPENSES
- ADD_EXPENSE
- UPDATE_EXPENSE
- GET_BUDGET
- GET_DEBTS
- ADD_DEBT
- MARK_DEBT_PAID
- GET_EMAILS
- SUMMARIZE_EMAIL
- CREATE_CALENDAR_EVENT
- GET_CALENDAR
- GET_EXAMS
- GET_ASSIGNMENTS

The router determines which controlled tool/function is required.

====================================================================
35. AI TOOLS / FUNCTION CALLING
====================================================================

Implement controlled tools such as:

get_today_schedule()
get_tomorrow_schedule()
get_week_schedule()

get_tasks()
create_task()
update_task()
complete_task()

get_expenses()
add_expense()
update_expense()
delete_expense()

get_budget()
get_financial_summary()

get_debts()
add_debt()
mark_debt_paid()

get_important_emails()
get_recent_emails()

get_exams()
get_assignments()

create_calendar_event()
get_calendar_events()

The AI should NOT get arbitrary SQL/database access.

It should only have controlled application tools.

====================================================================
36. AI ACTION CONFIRMATION
====================================================================

Create action-risk levels.

LOW RISK:
- Add expense from explicit user statement
- Read schedule
- Read tasks

MEDIUM RISK:
- Create calendar event
- Modify existing event
- Mark task completed

HIGH RISK:
- Delete records
- Bulk changes
- Disconnect account
- Delete data

High-risk actions require explicit confirmation.

Do not allow AI to perform dangerous destructive actions silently.

====================================================================
37. AI OUTPUT VALIDATION
====================================================================

Every structured AI result must go through:

AI
 ↓
Schema validation
 ↓
Business-rule validation
 ↓
Permission validation
 ↓
Action
 ↓
Database

Use TypeScript schemas.

Reject malformed or suspicious output.

====================================================================
38. AI HALLUCINATION RULE
====================================================================

The AI must follow this rule:

"Never invent unavailable information."

If information is missing:

return null / unknown

Example:

If email says:

"Exam date will be announced later."

DO NOT generate a date.

====================================================================
39. AI CONTEXT RETRIEVAL
====================================================================

Never send the entire user database to Gemini for every question.

Use:

User question
 ↓
Intent/router
 ↓
Relevant Supabase query
 ↓
Relevant context
 ↓
Gemini
 ↓
Response

Example:

"What did I spend on food this month?"

Backend calculates/retrieves:

Food expenses
₹120
₹250
₹180
₹90

Gemini only receives relevant information.

====================================================================
40. AI COST OPTIMIZATION
====================================================================

Use Gemini only where necessary.

AI:

- Email summarization
- Timetable extraction
- Document understanding
- Expense parsing
- Task extraction
- Chatbot
- AI financial insights

Normal application logic:

- CRUD
- Display data
- Calendar views
- Class countdown
- Notifications
- Search
- Calculations
- Filtering
- Navigation

Cache processed email summaries.

Do not summarize the same email repeatedly.

====================================================================
41. FLOATING ANDROID ASSISTANT
====================================================================

Implement an Android-first system-wide floating assistant.

Default state:

small movable bubble.

Tap:

expanded control panel.

Example:

Email
Finance
Tasks
Calendar
AI

The student must NOT be redirected to the full app for basic quick actions.

Tapping Email can show a translucent mini-window over the current application.

Tapping Finance shows a small finance window.

Tapping Tasks shows task window.

Tapping Calendar shows upcoming events.

Tapping AI opens a compact AI interface.

====================================================================
42. FLOATING ASSISTANT ARCHITECTURE
====================================================================

Use:

React Native
   ↓
Native Bridge
   ↓
Kotlin
   ↓
Android WindowManager
   ↓
Overlay

The overlay must be implemented using Android-native mechanisms where required.

React Native remains the primary UI/application layer.

Kotlin is used for Android-specific system integration.

====================================================================
43. FLOATING ASSISTANT BEHAVIOR
====================================================================

Support:

- Enable/disable
- Drag
- Minimize
- Expand
- Close
- Temporary hide
- Position persistence
- Appropriate lifecycle behavior
- Reboot handling where feasible
- Permission state handling

Do not continuously poll the backend from the floating overlay.

Use cached/local data and API requests only when necessary.

====================================================================
44. ANDROID PERMISSIONS
====================================================================

Implement appropriate Android permissions for:

- Notifications
- Overlay/display over other apps
- Calendar where needed
- Internet
- Background operation where required

Explain permissions before requesting them.

Do not abuse permissions.

The overlay can be fully disabled.

====================================================================
45. NOTIFICATION ENGINE
====================================================================

Build a central notification service.

Notification sources:

- Class reminders
- Task reminders
- Exam reminders
- Assignment deadlines
- Important emails
- Budget alerts
- Debt reminders
- System alerts

Do not scatter notification logic through random UI components.

====================================================================
46. LOCAL VS PUSH NOTIFICATIONS
====================================================================

Use local scheduled notifications for time-specific reminders whenever practical.

Example:

Class 10:00
 ↓
Device schedules
 ↓
9:50
 ↓
notification

Use backend push notifications for server-originated events such as:

Important email processed
Server-side event
System notification

Do not require the backend to wake every user every 10 minutes just to deliver class reminders.

====================================================================
47. NOTIFICATION PRIORITY
====================================================================

Levels:

LOW
NORMAL
HIGH
CRITICAL

Examples:

Normal class reminder = NORMAL
Assignment due today = HIGH
Exam tomorrow = CRITICAL
University emergency = CRITICAL

Implement quiet-hours rules.

====================================================================
48. QUIET HOURS
====================================================================

Default:

11 PM – 7 AM

Allow customization.

Critical notifications can optionally bypass quiet hours based on user preference.

====================================================================
49. NOTIFICATION CENTER
====================================================================

Create in-app notification history.

Show:

- Title
- Message
- Time
- Type
- Priority
- Read/unread
- Source

Support mark as read.

====================================================================
50. OFFLINE SUPPORT
====================================================================

The app should continue working for core data when offline.

Offline-readable:

- Today's timetable
- Upcoming classes
- Tasks
- Recent expenses
- Upcoming calendar events
- Preferences
- Existing notifications

Use a suitable local persistence mechanism.

Do not treat online-only behavior as acceptable for all core features.

====================================================================
51. SYNC ENGINE
====================================================================

Implement:

Local data
 ↕
Sync layer
 ↕
Supabase

Example:

Offline:
User adds ₹100 expense.

Store locally.

When internet returns:
Sync to Supabase.

Implement:

- Retry
- Idempotency
- Conflict strategy
- Sync status
- Last synced timestamp
- Failure state

Do not silently lose user data.

====================================================================
52. GLOBAL SEARCH
====================================================================

Search:

- Emails
- Tasks
- Classes
- Subjects
- Assignments
- Exams
- Expenses
- Debts
- Documents
- Calendar events

Use database/application search first.

Do not ask Gemini to perform broad database searching for simple queries.

====================================================================
53. DOCUMENT ASSISTANT
====================================================================

Allow students to upload:

- PDFs
- Circulars
- Assignment documents
- Syllabus
- University notices
- Lab instructions
- Timetable files

Extract useful:

- Dates
- Deadlines
- Actions
- Requirements
- Key information

Allow:

Create Task
Add Calendar Event
Save Document

====================================================================
54. CAMPUS INTELLIGENCE
====================================================================

Do NOT require campus navigation for MVP.

Prepare architecture for a future feature:

Next class
 ↓
Room
 ↓
Campus map
 ↓
Walking time
 ↓
Leave-by recommendation

Do not pretend this feature exists if the actual campus map/data is unavailable.

====================================================================
55. FUTURE STUDY ASSISTANT
====================================================================

Architect, but do not make core MVP dependent on:

- Notes
- AI study planner
- Revision assistant
- Attendance
- Bank/UPI integrations
- Campus navigation

These are Phase 2 or later.

====================================================================
56. PRIVACY CENTER
====================================================================

Create a visible privacy/security section.

Show:

Google account connected
Gmail connected
Google Calendar connected
AI processing enabled
Floating assistant enabled

Allow:

Disconnect Gmail
Disconnect Calendar
Disable floating assistant
Delete AI history
Export data
Delete account

====================================================================
57. ACCOUNT DELETION
====================================================================

Account deletion must address:

- Supabase user
- Profile
- Timetable
- Classes
- Tasks
- Expenses
- Debts
- Calendar data created by the app where appropriate
- Email summaries/metadata
- AI conversations
- Documents
- Storage files
- Device tokens
- Google OAuth connection handling

Implement this as a deliberate server-side workflow.

====================================================================
58. SECURITY
====================================================================

Implement:

- Google OAuth
- Supabase Auth
- JWT/session validation
- Supabase RLS
- HTTPS
- Server-side secrets
- Secure local token storage
- Authorization checks
- Input validation
- Rate limiting
- Request size limits
- Error sanitization

A user MUST only access their own data.

Never rely on frontend-only checks for authorization.

====================================================================
59. DATABASE DESIGN
====================================================================

Use PostgreSQL in Supabase.

Create a normalized schema around entities including:

profiles
google_accounts / provider_connections where needed

email_accounts
emails
email_processing

semesters
subjects

timetables
classes

calendar_events

tasks
task_reminders

exams
assignments

expenses
expense_categories
budgets

debts
shared_expenses
expense_shares

notifications
device_tokens

documents

ai_conversations
ai_messages

user_preferences

sync_records

audit records where appropriate

Do not blindly implement every table if a simpler normalized design is better, but preserve all required domain functionality.

Use foreign keys.

Use indexes.

Use timestamps.

Use appropriate unique constraints.

====================================================================
60. DATABASE SECURITY
====================================================================

Use Supabase Row Level Security.

Users must not be able to query another student's:

- Tasks
- Expenses
- Emails
- Calendar
- Debts
- AI conversations
- Documents
- Timetable

Service-role credentials must remain server-side.

Never expose service-role keys to React Native.

====================================================================
61. BACKEND ARCHITECTURE
====================================================================

Use modular Fastify + TypeScript.

Suggested backend structure:

backend/
  src/
    server.ts
    app.ts

    config/
      env.ts

    routes/
      auth.ts
      gmail.ts
      calendar.ts
      emails.ts
      timetable.ts
      tasks.ts
      expenses.ts
      budgets.ts
      debts.ts
      assignments.ts
      exams.ts
      documents.ts
      notifications.ts
      chatbot.ts
      search.ts

    services/
      gemini/
        client.ts
        router.ts
        prompts/
        schemas/
        tools/

      google/
        oauth.ts
        gmail.ts
        calendar.ts

      email/
        sync.ts
        processor.ts
        classifier.ts

      timetable/
        parser.ts
        validator.ts

      finance/
        calculator.ts
        categorizer.ts

      tasks/
        reminderEngine.ts

      notifications/
        scheduler.ts
        push.ts

      documents/
        parser.ts

      sync/
        syncService.ts

    repositories/
      userRepository.ts
      emailRepository.ts
      taskRepository.ts
      expenseRepository.ts
      timetableRepository.ts
      calendarRepository.ts
      debtRepository.ts

    middleware/
      auth.ts
      rateLimit.ts
      errorHandler.ts
      validation.ts

    jobs/
      emailProcessingJob.ts
      syncJob.ts
      notificationJob.ts

    utils/
    types/

  tests/

Use clear separation between:

routes
business services
database repositories
AI layer
external integrations

====================================================================
62. MOBILE APP STRUCTURE
====================================================================

Suggested structure:

mobile/
  app/
    navigation/
    screens/
      onboarding/
      dashboard/
      email/
      timetable/
      calendar/
      tasks/
      finance/
      debts/
      documents/
      notifications/
      ai/
      settings/
      privacy/
      search/

    components/
      common/
      dashboard/
      email/
      timetable/
      calendar/
      tasks/
      finance/
      floating/

    store/
      authStore.ts
      userStore.ts
      timetableStore.ts
      taskStore.ts
      financeStore.ts
      emailStore.ts
      notificationStore.ts
      uiStore.ts

    api/
      client.ts
      auth.ts
      emails.ts
      timetable.ts
      tasks.ts
      finance.ts
      calendar.ts
      chatbot.ts

    hooks/
    services/
      notifications/
      storage/
      sync/
      permissions/

    utils/
    types/

    theme/

    assets/

  android/
    native overlay code
    Kotlin modules
    permissions
    services

  tests/

Keep shared TypeScript types in a shared package when beneficial.

====================================================================
63. SHARED TYPES
====================================================================

If practical, use a shared package:

shared/
  schemas/
  types/
  constants/

Use schema definitions that can be shared conceptually between frontend and backend.

Do not duplicate domain structures unnecessarily.

====================================================================
64. ENVIRONMENT VARIABLES
====================================================================

Backend environment examples:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
APP_BASE_URL

Mobile environment examples should contain ONLY values safe for client exposure.

Never put service-role keys or Gemini secret keys into the mobile bundle.

Create:

.env.example

and proper deployment documentation.

====================================================================
65. GOOGLE OAUTH IMPLEMENTATION
====================================================================

Implement Google OAuth carefully.

Requirements:

- One Google identity
- Supabase user mapping
- Gmail permissions
- Calendar permissions
- Access-token lifecycle
- Refresh mechanism
- Revocation/disconnect
- Error states
- Reauthorization flow

Never store user passwords.

Make the OAuth design compatible with mobile redirect/deep-link behavior.

====================================================================
66. BACKGROUND JOB SYSTEM
====================================================================

Use background jobs for long-running work.

Examples:

- Gmail processing
- Document processing
- Timetable processing
- AI summarization
- Sync
- Notification preparation

Requirements:

- Retry
- Idempotency
- Failure state
- Logging
- No duplicate processing

Do not create infinite uncontrolled loops.

====================================================================
67. PERFORMANCE
====================================================================

Optimize for mobile:

- Avoid unnecessary re-renders
- Cache server data
- Pagination where appropriate
- Lazy-load large views
- Compress uploads where appropriate
- Avoid huge AI prompts
- Avoid duplicate AI calls
- Avoid continuous polling
- Avoid battery-draining background behavior

Floating assistant must be lightweight.

====================================================================
68. ERROR HANDLING
====================================================================

Implement user-friendly states for:

Gemini unavailable
Gmail unavailable
Google OAuth expired
Calendar permission revoked
Supabase unavailable
Network unavailable
Timetable extraction failed
AI parsing failed
Notification scheduling failed
Sync failed
Invalid AI output

Examples:

"AI processing is temporarily unavailable."

"Your Google connection needs to be renewed."

"Your changes are saved locally and will sync when you're back online."

Do not crash the app for recoverable errors.

====================================================================
69. UI/UX REQUIREMENTS
====================================================================

Design should feel:

- Premium
- Modern
- Minimal
- Fast
- Student-focused
- Clean
- Mobile-native

Use:

- Rounded cards
- Clear typography
- Consistent spacing
- Subtle glass/translucent visual language for the floating assistant
- Smooth animations
- Strong hierarchy
- Clear empty states
- Loading states
- Error states
- Success states

Do not overuse animations.

Accessibility:

- Appropriate font scaling
- Good contrast
- Touch-friendly controls
- Screen-reader support where feasible
- Reduced-motion awareness

====================================================================
70. API DESIGN
====================================================================

Provide clean REST APIs.

Examples:

POST /api/ai/chat
POST /api/ai/expense
POST /api/ai/task
POST /api/ai/timetable

GET /api/emails
POST /api/emails/sync

GET /api/timetable
POST /api/timetable

GET /api/classes

GET /api/calendar
POST /api/calendar/events

GET /api/tasks
POST /api/tasks
PATCH /api/tasks/:id
DELETE /api/tasks/:id

GET /api/expenses
POST /api/expenses
PATCH /api/expenses/:id
DELETE /api/expenses/:id

GET /api/budgets

GET /api/debts
POST /api/debts
PATCH /api/debts/:id

GET /api/notifications

GET /api/search

Use validation on every input.

====================================================================
71. IDEMPOTENCY
====================================================================

Important operations should be idempotent.

Examples:

- Email processing
- Calendar synchronization
- Expense creation from retried AI request
- Notification scheduling
- Background jobs

Do not create duplicate records because a request was retried.

====================================================================
72. SEARCH
====================================================================

Provide global search.

Search across appropriate tables.

Support:

- Subject names
- Email subject
- Email sender
- Task names
- Expense descriptions
- Debt names
- Documents
- Assignments
- Exams
- Calendar events

====================================================================
73. OBSERVABILITY
====================================================================

Implement:

- Structured backend logging
- Error monitoring
- Useful development logs
- AI processing logs without exposing private content unnecessarily
- Request IDs/correlation IDs where practical
- Job status logs

Track:

- AI failures
- Email sync failures
- Notification failures
- Background-job failures
- API latency
- Database errors

====================================================================
74. RATE LIMITING
====================================================================

Protect AI and backend endpoints.

Implement:

- Auth enforcement
- Rate limits
- Payload size limits
- Timeouts
- Abuse prevention

Do not permit unlimited AI calls from one client.

====================================================================
75. ADMIN / INTERNAL OPERATIONS
====================================================================

Create a basic internal/admin strategy for monitoring:

- User count
- AI requests
- Failed jobs
- Email sync problems
- Notification failures
- System health

Do not expose admin functionality to normal students.

====================================================================
76. TESTING REQUIREMENTS
====================================================================

Write tests before claiming completion.

UNIT TESTS:

- Finance calculations
- Budget calculations
- Date handling
- Reminder rules
- Debt calculations
- Recurrence
- AI schema validation
- Subject mapping

BACKEND TESTS:

- Authentication
- Authorization
- CRUD
- RLS assumptions
- API errors
- Rate limiting
- External service failure handling

MOBILE TESTS:

- Navigation
- Forms
- Loading states
- Offline states
- Task creation
- Expense creation
- Dashboard rendering

INTEGRATION TESTS:

Google OAuth flow where practical
Gmail processing
Calendar creation
Gemini parsing
Supabase persistence

AI EVALUATION:

Create fixed test cases such as:

"Spent 200 on biryani."

Expected:
amount=200
category=food

"AI assignment due Friday, extremely important."

Expected:
task
deadline=Friday
priority=extremely important

Timetable image:
Expected correct class extraction

University email with rescheduled class:
Expected date/time change detected

AI must not hallucinate missing dates.

====================================================================
77. DEBUGGING REQUIREMENT
====================================================================

When an error occurs:

1. Reproduce
2. Inspect logs
3. Identify root cause
4. Fix root cause
5. Add regression test
6. Retest
7. Continue

Do NOT simply suppress errors.

Do NOT change behavior merely to make tests pass if the underlying architecture is wrong.

====================================================================
78. 4-PART SELF-IMPROVEMENT LOOP
====================================================================

You MUST operate using this loop for the entire project.

--------------------------------------------------
PHASE A — CONTEXT
--------------------------------------------------

Before implementing any major subsystem, restate internally:

- What the feature must accomplish
- Which user problem it solves
- Which platform it runs on
- What data it needs
- Which services it touches
- Security constraints
- Failure scenarios
- Dependencies
- Acceptance criteria

--------------------------------------------------
PHASE B — EXECUTION PROTOCOL
--------------------------------------------------

Implement systematically:

1. Inspect repository
2. Inspect existing files
3. Determine missing pieces
4. Plan changes
5. Create/update files
6. Install required dependencies
7. Configure environment
8. Implement feature
9. Connect frontend to backend
10. Connect backend to database
11. Connect external APIs
12. Add error handling
13. Add tests
14. Run tests
15. Run build/type-check/lint
16. Review results

Never assume an integration works merely because code compiles.

--------------------------------------------------
PHASE C — BUILT-IN CRITIC
--------------------------------------------------

After each major implementation, independently critique the result.

Ask:

FUNCTIONAL:
- Does this really work?
- Are buttons connected?
- Are API calls real?
- Is data persisted?
- Are permissions handled?
- Are edge cases covered?

SECURITY:
- Are secrets exposed?
- Can one user access another user's data?
- Are OAuth tokens handled safely?
- Can AI trigger unsafe operations?

AI:
- Does the model return structured output?
- Is the schema validated?
- Can it hallucinate?
- Is context minimized?
- Can duplicate actions happen?

UX:
- Is the flow understandable?
- What happens when offline?
- What happens during loading?
- What happens when permission is denied?
- What happens when AI fails?

PERFORMANCE:
- Are there unnecessary network requests?
- Duplicate AI requests?
- Battery-heavy background loops?
- Large database queries?
- Large prompts?

ANDROID:
- Does overlay permission work?
- Does the floating widget behave correctly?
- Does it survive lifecycle events appropriately?
- Does it avoid opening the full app unnecessarily?

BACKEND:
- Are jobs idempotent?
- Are retries safe?
- Are rate limits present?
- Are logs useful?

DATABASE:
- Are relationships correct?
- Are indexes present?
- Is RLS correct?
- Are timestamps/status fields present?
- Are duplicates prevented?

--------------------------------------------------
PHASE D — EXIT CONDITION
--------------------------------------------------

NEVER declare the application complete until ALL of the following are true:

1. Mobile app builds successfully.
2. Backend starts successfully.
3. Database migrations apply successfully.
4. Authentication works.
5. Google login works.
6. Gmail integration works in configured environment.
7. Google Calendar integration works in configured environment.
8. Gemini integration works in configured environment.
9. Timetable processing works.
10. Email summarization works.
11. Expense parsing works.
12. Task creation works.
13. Reminder scheduling works.
14. Finance calculations work.
15. Borrow/lend works.
16. Search works.
17. Offline core experience works.
18. Sync works.
19. Android floating assistant works.
20. Android permissions are handled.
21. Error states work.
22. User-data isolation works.
23. RLS policies are verified.
24. Secrets are not bundled in the mobile app.
25. Tests pass.
26. Type-check passes.
27. Lint passes.
28. Production build succeeds.
29. Deployment configuration is documented.
30. README is complete.
31. No critical TODOs remain.
32. No fake/mock implementation is used for a required core feature.
33. No known critical security issue remains.
34. No required button is disconnected.
35. No critical feature is merely a UI placeholder.

If something fails:

DO NOT STOP.

Return to:

CONTEXT
 ↓
EXECUTION
 ↓
CRITIC
 ↓
FIX
 ↓
RETEST

Repeat until the exit condition is satisfied.

====================================================================
79. IMPLEMENTATION ORDER
====================================================================

Do not build randomly.

Build in this order:

PHASE 0
Repository inspection
Architecture
Environment
Dependency setup

PHASE 1
Supabase
Database schema
Migrations
RLS
Auth

PHASE 2
React Native foundation
Navigation
Theme
Shared types
API client
State management

PHASE 3
Google OAuth
Gmail integration
Calendar integration

PHASE 4
Render backend
API layer
Auth middleware
Database repositories

PHASE 5
Gemini integration
AI router
Structured schemas
Tool calling
Validation

PHASE 6
Timetable analyzer
Review/edit screen
Calendar generation
Conflict detection

PHASE 7
Email summarization
Email classification
Important email detection
Deadline extraction

PHASE 8
Task manager
Reminder engine
Notification center
Quiet hours

PHASE 9
Finance
Expenses
Budgets
Analytics
Balance
Borrow/lend
Shared expenses

PHASE 10
AI chatbot
Context retrieval
Tool/function calling
Action confirmation

PHASE 11
Offline storage
Sync
Conflict handling

PHASE 12
Android floating assistant
Kotlin
WindowManager
Native bridge
Mini windows

PHASE 13
Global search
Documents
Privacy center
Data deletion

PHASE 14
Testing
Security review
Performance review
AI evaluation

PHASE 15
Deployment
Production configuration
README
Final verification

====================================================================
80. DATABASE MIGRATIONS
====================================================================

Use migrations.

Do NOT manually create production tables through ad-hoc dashboard clicks without migration files.

Every schema modification must be reproducible.

Provide:

supabase/
  migrations/
  seed/

Create realistic development seed data.

Do not use fake data in production by default.

====================================================================
81. DEVELOPMENT SEED DATA
====================================================================

Create optional development-only seed data:

Student profile
Subjects
Classes
Tasks
Expenses
Debts
Notifications

Use obvious DEV markers.

Do not accidentally seed fake university emails into production.

====================================================================
82. README REQUIREMENTS
====================================================================

README must include:

- Product overview
- Architecture
- Tech stack
- Repository structure
- Prerequisites
- Local setup
- Environment variables
- Supabase setup
- Google Cloud setup
- Gmail API setup
- Google Calendar setup
- Gemini setup
- Render deployment
- Android permissions
- Floating assistant setup
- Database migration instructions
- Test commands
- Build commands
- Common troubleshooting
- Production checklist
- Privacy/security notes

====================================================================
83. REQUIRED DELIVERABLES
====================================================================

The finished repository must contain:

mobile/
backend/
supabase/
shared/ where useful
docs/
README.md
.env.example files
tests/
deployment/configuration files

Also provide documentation for:

Architecture
Database
API
AI tools
Google OAuth
Notifications
Offline sync
Android overlay
Deployment

====================================================================
84. DEVELOPMENT PRINCIPLES
====================================================================

Follow these principles:

- Real implementations over demos
- Small modular services
- Type safety
- Explicit validation
- Secure defaults
- Least privilege
- Idempotent operations
- Deterministic calculations
- AI only where AI adds value
- Database as source of truth
- Backend as security boundary
- Mobile app as client
- Native Android only where required
- Graceful degradation
- Offline resilience
- Observable background jobs
- Tests for critical functionality

====================================================================
85. DO NOT DO THESE THINGS
====================================================================

DO NOT:

- Put Gemini secret key in mobile code
- Put Supabase service role key in mobile code
- Store Google passwords
- Give Gemini arbitrary SQL access
- Trust unvalidated AI JSON
- Create calendar duplicates
- Process the same email repeatedly
- Make endless polling loops
- Create battery-draining background loops
- Silently delete user data
- Fake Gmail integration
- Fake Calendar integration
- Fake notifications
- Fake database data
- Leave buttons with TODO handlers
- Claim success without running tests
- Skip security because this is an MVP

====================================================================
86. CRITICAL END-TO-END DEMONSTRATION
====================================================================

The completed application must support this complete demonstration:

STEP 1
Student opens application.

STEP 2
Student taps "Continue with Google."

STEP 3
Google authentication succeeds.

STEP 4
Student grants Gmail and Google Calendar permissions.

STEP 5
Student uploads timetable.

STEP 6
AI extracts classes.

STEP 7
Student reviews timetable.

STEP 8
App saves classes.

STEP 9
App creates calendar events.

STEP 10
Reminder engine schedules 10-minute class reminder.

STEP 11
University sends email about changed class schedule.

STEP 12
Gmail integration discovers email.

STEP 13
Gemini summarizes email.

STEP 14
Gemini extracts schedule change.

STEP 15
Backend validates the extraction.

STEP 16
App updates the relevant event/task after appropriate confirmation rules.

STEP 17
Student receives an important notification.

STEP 18
Student types:

"Spent ₹180 on dinner."

STEP 19
Gemini parses expense.

STEP 20
Backend validates.

STEP 21
Supabase stores expense.

STEP 22
Finance dashboard updates.

STEP 23
Student says:

"Rahul borrowed ₹500 from me."

STEP 24
Debt is created.

STEP 25
Student says:

"Create a very important task to finish my ML assignment by Friday."

STEP 26
AI creates task with priority and deadline.

STEP 27
Reminder engine schedules reminders.

STEP 28
Student asks:

"What do I have tomorrow?"

STEP 29
AI retrieves tomorrow's schedule through a controlled tool.

STEP 30
AI gives a real answer based on Supabase data.

STEP 31
Student taps the Android floating assistant.

STEP 32
Mini control panel appears.

STEP 33
Student taps Email.

STEP 34
A compact translucent email window appears.

STEP 35
The full app DOES NOT open.

STEP 36
Student taps Finance.

STEP 37
Compact finance window appears.

STEP 38
Student taps Tasks.

STEP 39
Compact tasks window appears.

STEP 40
All data remains synchronized with the backend.

====================================================================
87. FINAL SELF-REVIEW LOOP
====================================================================

Before declaring completion, perform the following loop:

BUILD
 ↓
RUN
 ↓
TEST
 ↓
CRITIQUE
 ↓
LIST FAILURES
 ↓
PRIORITIZE FAILURES
 ↓
FIX
 ↓
RUN AGAIN
 ↓
TEST AGAIN
 ↓
SECURITY REVIEW
 ↓
UX REVIEW
 ↓
AI REVIEW
 ↓
PERFORMANCE REVIEW
 ↓
REPEAT

Continue until the measurable exit condition is met.

====================================================================
88. FINAL OUTPUT TO THE USER
====================================================================

After implementation is genuinely complete, provide:

1. Final architecture summary
2. Final file tree
3. Database schema summary
4. API summary
5. AI tool list
6. Google OAuth setup
7. Environment variables
8. Local run commands
9. Deployment commands
10. Android build/install instructions
11. Floating assistant permission instructions
12. Test results
13. Known limitations
14. Phase-2 feature recommendations

Do NOT say "fully working" unless the defined exit conditions have actually been tested.

If external credentials are required and unavailable, implement the integration fully, provide precise setup instructions, and clearly distinguish "code complete" from "credential/environment verification pending."

====================================================================
89. PRIMARY GOAL
====================================================================

Build a real application, not a prototype screenshot.

The final user experience should feel like:

"An AI operating system for student life."

The student should be able to:

- Log in once with Google
- Connect Gmail and Google Calendar
- Have university information understood automatically
- Convert timetable information into calendar events
- Receive intelligent reminders
- Manage tasks conversationally
- Track money conversationally
- Track debts
- Understand spending
- Ask AI questions about their actual student data
- Work offline for important information
- Use the floating Android assistant without opening the full application

Most importantly:

THE SYSTEM MUST WORK AS ONE CONNECTED PRODUCT.

Do not implement isolated feature demos.

Every module must share the correct identity, database, backend, AI orchestration, notifications, and security model.

====================================================================
90. START NOW
====================================================================

FIRST:

Inspect the repository and existing project state.

Then create a concise implementation plan based on what already exists.

Do not unnecessarily rewrite working code.

Identify:

- Existing frontend
- Existing backend
- Existing database
- Existing environment
- Existing dependencies
- Existing routes
- Existing screens
- Existing Android native code

Then execute the implementation phases in order.

After every major phase:

1. Build
2. Test
3. Critique
4. Fix
5. Re-test

Do not proceed past a broken foundation unless the problem is explicitly isolated and tracked.

Continue until the EXIT CONDITION is satisfied.
               MASTER PROMPT
                     │
                     ▼
              Inspect project
                     │
                     ▼
              Architecture
                     │
                     ▼
              Database first
                     │
                     ▼
              Backend foundation
                     │
                     ▼
              Google integration
                     │
                     ▼
              Gemini AI layer
                     │
                     ▼
              Mobile features
                     │
                     ▼
              Notifications
                     │
                     ▼
             Android overlay
                     │
                     ▼
                Offline/sync
                     │
                     ▼
              Testing + Security
                     │
                     ▼
              Deployment
                     │
                     ▼
             BUILT-IN CRITIC
                     │
              ┌──────┴──────┐
              │             │
           Problems       Pass
              │             │
              ▼             ▼
             FIX       EXIT CONDITION?
              │             │
              └──────↩──────┘
                                  GOOGLE ACCOUNT
                         │
              ┌──────────┴──────────┐
              │                     │
            LOGIN             Gmail / Calendar
              │                     │
              └──────────┬──────────┘
                         ▼
                 REACT NATIVE APP
                    TypeScript
                         │
                         ▼
                  RENDER BACKEND
                 Node + Fastify
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          GEMINI      SUPABASE    GOOGLE APIs
            AI       PostgreSQL   Gmail/Calendar
             │           │
             └─────┬─────┘
                   ▼
             AI ORCHESTRATOR
                   │
      ┌────────────┼───────────────┐
      ▼            ▼               ▼
   Email       Timetable        Finance
      │            │               │
      └────────────┼───────────────┘
                   ▼
             Tasks / Calendar
                   │
                   ▼
              Notifications
                   │
                   ▼
          ANDROID FLOATING
             ASSISTANT
                   │
                Kotlin
                   │
             WindowManager
             Email / Timetable / Student Input
              ↓
            Gemini
              ↓
       Structured Output
              ↓
          Validation
              ↓
           Supabase
              ↓
       Action / Reminder
              ↓
        Student Interaction
              ↓
         New Information
              ↓
            Gemini
              ↺
              Context
   ↓
Execution
   ↓
Self-Critique
   ↓
Improve
   ↓
Test
   ↓
Exit Condition?
   ├── No → Repeat
   └── Yes → Deliver