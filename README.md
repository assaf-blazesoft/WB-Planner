# Winbonanza Planner

Internal project planning tool — invite-only, Gantt + Table + Dashboard views, role-based task assignments and comments.

---

## Tech Stack

| Layer      | Tool |
|------------|------|
| Frontend   | React 18 + Vite + Tailwind CSS |
| State      | Zustand (tasks sync to Supabase, UI prefs in localStorage) |
| Auth + DB  | Supabase (Postgres + Auth) |
| Email      | Resend (Cloudflare Worker — wiring TBD) |
| Hosting    | Cloudflare Pages |

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

Email sending requires a Cloudflare Worker endpoint (future work). For now, email calls silently no-op in local dev.

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

## Deployment (Cloudflare Pages)

### 1. Connect repo

- Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git**
- Select your repo
- Build command: `npm run build`
- Build output directory: `dist`

### 2. Set environment variables

In **Cloudflare Pages → Settings → Environment Variables**, add these for both **Production** and **Preview**:

```
VITE_SUPABASE_URL      = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key
```

> **Important:** These are Vite build-time variables — they get baked into the JS bundle during the build. After adding or changing them in Cloudflare, you must **Retry deployment** for the change to take effect.

### 3. Deploy

Push to `main` — Cloudflare Pages auto-deploys on every push. Or click **Retry deployment** in the dashboard after setting env vars.

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

supabase/
└── schema.sql        # Full DB schema + RLS policies
```
