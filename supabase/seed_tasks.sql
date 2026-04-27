-- Seed initial tasks into Supabase.
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to re-run: ON CONFLICT DO NOTHING skips rows that already exist.

insert into public.tasks (id, title, description, track, status, priority, weeks, progress_percent, owner, notes, tags, dependencies, created_at, updated_at)
values
  (
    'wb-001', 'PPC kickoff (Boosteam)',
    'Kickoff Boosteam for PPC automation. Replaces manual PPC work. Should not take more than a week.',
    'ops', 'not_started', 'high', '{1}', 0, '', 'Kickoff Monday.',
    '{"automation","ppc","marketing"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-002', 'Game testing 1-2',
    'Improve game testing to function without dedicated game tester. Currently in progress with some manual testing still required.',
    'ops', 'in_progress', 'high', '{1,2}', 40, '', 'Ongoing improvement. Goal: remove manual game tester role.',
    '{"automation","qa","testing"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-003', 'Monthly presentation report',
    'Monthly presentation report build-out.',
    'ops', 'in_progress', 'medium', '{2}', 30, '', 'In progress.',
    '{"reporting","automation"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-004', 'Auto publish banners',
    'Automated banner publishing pulled from sheet + art.',
    'ops', 'not_started', 'medium', '{3}', 0, '', 'Pull source from sheet, combine with art assets, publish.',
    '{"automation","banners","marketing"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-005', 'Main screen offers',
    'Promotion offers displayed on main screen (Crowncoins style) plus rolling offer option.',
    'feature', 'not_started', 'high', '{1,2}', 0, '', 'Reference: Crowncoins implementation. Include rolling offer carousel.',
    '{"promotions","ui","main-screen"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-006', 'Bottom navigation bar',
    'Crown-style bottom navigation bar.',
    'feature', 'not_started', 'medium', '{3}', 0, '', 'Reference: Crown bottom nav.',
    '{"ui","navigation"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-007', 'Rewards hub',
    'Centralized place for all promotions and offers, plus new rewards.',
    'feature', 'not_started', 'high', '{3,4}', 0, '', 'Central hub UI. Aggregates promotions, offers, and new rewards.',
    '{"rewards","promotions","ui"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-008', 'Onboarding guide',
    'How-to guide for placing and using the platform.',
    'feature', 'not_started', 'medium', '{4}', 0, '', 'User-facing guide for platform usage.',
    '{"onboarding","ux"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-009', 'Daily missions system',
    'Conditional fallback if Smartico does not kick in. Daily missions with progression and timers.',
    'feature', 'conditional', 'medium', '{4,5,6}', 0, '', 'Only build if Smartico delays past week 4.',
    '{"smartico-fallback","missions","engagement"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-010', 'Visible progress bars',
    'Conditional fallback. Progress bars for challenges and events visible on home screen.',
    'feature', 'conditional', 'medium', '{4,5,6}', 0, '', 'Only build if Smartico delays past week 4.',
    '{"smartico-fallback","ui","engagement"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-011', 'Structured 7-day daily bonus',
    'Conditional fallback. Daily bonus with clear 7-day display.',
    'feature', 'conditional', 'medium', '{4,5,6}', 0, '', 'Only build if Smartico delays past week 4.',
    '{"smartico-fallback","bonus","engagement"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-012', 'Game content & planning',
    'Adapt and improve Arshnoor''s game content approach to fit Winbonanza needs.',
    'ongoing', 'in_progress', 'medium', '{1,2,3,4,5,6}', 20, '', 'Continuous workstream. Reference Arshnoor''s existing process.',
    '{"content","planning","games"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-013', 'Marketing event + art sheet',
    'Create marketing events and accompanying art sheet.',
    'ongoing', 'in_progress', 'medium', '{1,2}', 10, '', 'Marketing creation workstream.',
    '{"marketing","events","art"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-014', 'SEO automation',
    'SEO automation workstream. Spans 2 weeks starting Week 1.',
    'ops', 'not_started', 'medium', '{1,2}', 0, '', 'Sync with Jacob to understand current status before kickoff.',
    '{"automation","seo"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-015', 'Auto-rotate / schedule banners',
    'Automated banner rotation and scheduling system.',
    'ops', 'not_started', 'medium', '{3}', 0, '', 'Builds on auto-publish banners (wb-004). Adds rotation logic and scheduling.',
    '{"automation","banners","marketing"}', '{"wb-004"}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-016', 'Auto-update game categories',
    'Automatically update game categories: Hot, Featured, Event.',
    'ops', 'not_started', 'medium', '{4}', 0, '', 'Categories to automate: Hot, Featured, Event.',
    '{"automation","games","categories"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-017', 'Auto comp winners — Step 1 (with CX message)',
    'Fully automate comp winners flow up to the point of sending CX message. Current pain point.',
    'ops', 'not_started', 'high', '{2}', 0, '', 'Step 1 of 2. End state: pipeline runs end-to-end and produces a CX message that still requires human send.',
    '{"automation","comp-winners","cx","pain-point"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-018', 'Auto comp winners — Step 2 (full auto, no CX)',
    'Fully automate comp winners end-to-end, removing the CX touchpoint entirely.',
    'ops', 'not_started', 'high', '{5}', 0, '', 'Step 2 of 2. Depends on Step 1 (wb-017) being live and stable.',
    '{"automation","comp-winners"}', '{"wb-017"}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-019', 'Art assets via Cloudflare flow',
    'Automate art asset links (game icons, banners, category icons, etc.) through a Cloudflare-based flow.',
    'ops', 'not_started', 'high', '{1}', 0, '', 'Covers all art asset types: game icons, banners, category icons, etc.',
    '{"automation","art","cloudflare","assets"}', '{}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  ),
  (
    'wb-020', 'Art assets — CRM sync & auto-publish',
    'Connect Cloudflare art flow to the CRM so assets automatically sync and publish once ready.',
    'ops', 'not_started', 'high', '{2}', 0, '', 'Step 2 of art automation. Depends on wb-019 (Cloudflare flow) being in place.',
    '{"automation","art","crm","publishing"}', '{"wb-019"}',
    '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'
  )
on conflict (id) do nothing;
