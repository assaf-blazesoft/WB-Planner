# Winbonanza Planner

Internal project planning tool — invite-only, Gantt + Table + Dashboard views, role-based task assignments and comments.

---

## Tech Stack

| Layer      | Tool |
|------------|------|
| Frontend   | React 18 + Vite + Tailwind CSS |
| State      | Zustand (tasks sync to Supabase, UI prefs in localStorage) |
| Auth + DB  | Supabase (Postgres + Auth) |
| Email      | Resend via Netlify Function |
| Hosting    | Netlify |

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/your-org/wb-roadmap.git
cd wb-roadmap
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project (**Project Settings → API**).

> **Without Supabase vars**: the app runs in offline mode — auth is bypassed and tasks use localStorage. Useful for UI development.

### 3. Start the dev server

```bash
npm run dev
```

To also test email functions locally, use [netlify dev](https://docs.netlify.com/cli/get-started/) instead:
```bash
npm install -g netlify-cli
netlify dev
```

---

## Supabase Setup

### 1. Create a project

Go to [supabase.com](https://supabase.com), create a new project, copy the **URL** and **anon key** into `.env.local`.

### 2. Run the schema

Open **Supabase Dashboard → SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.

This creates tables for: `profiles`, `invites`, `tasks`, `task_assignments`, `comments`, `notification_log`.

### 3. Disable email confirmation (required for invite flow)

**Auth → Settings → Email → Confirm email** → **toggle OFF**.

This allows new users to sign in immediately after accepting an invite, without a confirmation step.

### 4. Seed tasks (optional)

Import the initial tasks by running this in the SQL Editor:

```sql
-- Copy tasks from src/data/seed.json into the tasks table
-- Or use the Import CSV feature in Table View after signing in as admin
```

### 5. Sign up as owner

Open the app and sign up with `assafc@blazesoft.ca`. The trigger in `schema.sql` automatically grants this email the `owner` role.

---

## Deployment (Netlify)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/wb-roadmap.git
git push -u origin main
```

### 2. Connect to Netlify

- Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
- Select your repo
- Build command: `npm run build`
- Publish directory: `dist`

Netlify will auto-detect `netlify.toml` — no manual config needed.

### 3. Set environment variables

In **Netlify → Site → Environment Variables**, add:

```
VITE_SUPABASE_URL        = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY   = your-anon-key
RESEND_API_KEY           = re_your_key
FROM_EMAIL               = noreply@yourdomain.com
APP_URL                  = https://your-app.netlify.app
```

### 4. Deploy

Trigger a deploy from the Netlify dashboard, or push to `main`.

---

## Email Setup (Resend)

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your sending domain (or use `onboarding@resend.dev` for testing)
3. Copy your API key into the `RESEND_API_KEY` environment variable

Email is sent for:
- **Invite** — when admin invites a new user
- **Task assigned** — when a task is assigned to a user
- **Status update** — when a task's status changes (notifies assignees)
- **New comment** — when someone comments on a task (notifies other assignees)

---

## Roles

| Role  | Capabilities |
|-------|-------------|
| owner | Full access + invite users + manage all tasks |
| admin | Same as owner |
| user  | View and update assigned tasks only (status, progress, notes, comments) |

The email `assafc@blazesoft.ca` is automatically granted `owner` on first sign-up (via Supabase trigger).

---

## Invite Flow

1. Owner/admin goes to **Admin** panel
2. Enters user's email → clicks **Send invite**
3. User receives an email with a one-time link (`/accept-invite?token=...`)
4. User sets their name + password → account is created
5. Admin assigns tasks to the user from the task detail panel

---

## Project Structure

```
src/
├── lib/              # supabase client, constants, email helper
├── contexts/         # AuthContext — user, profile, isAdmin
├── pages/            # LoginPage, AcceptInvitePage
├── components/
│   ├── admin/        # AdminPanel — invite management
│   ├── GanttView     # Interactive Gantt timeline
│   ├── TableView     # Sortable task table
│   ├── DashboardView # Charts and KPIs
│   ├── TaskDetailPanel  # Task editing + assignments + comments
│   ├── TaskComments  # Comment thread
│   └── ProtectedRoute
├── store/tasks.js    # Zustand store (Supabase-backed)
└── utils/            # Date helpers, CSV import/export

netlify/functions/
└── send-email.js     # Transactional email via Resend

supabase/
└── schema.sql        # Full DB schema + RLS policies
```
