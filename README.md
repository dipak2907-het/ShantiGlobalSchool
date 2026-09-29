# Shanti Global School website

Next.js + TypeScript + Tailwind CSS website for **Shanti Global School**, session **2026-27**. It uses Supabase, Cloudflare Workers, YouTube Live, Resend, and optional Gemini.

## Before publishing

Replace every `PLACEHOLDER` in [src/config/school.ts](./src/config/school.ts). Also obtain school approval for privacy and child-photo-consent wording.

The site uses **Cloudflare Workers**, not Pages, because secure API routes are required for the chatbot, forms, and authentication. Cloudflare Workers provides a free `workers.dev` HTTPS URL. A `.in` or `.com` domain normally costs money separately.

## Free accounts needed

1. Supabase: database, authentication, photo storage, Realtime.
2. Cloudflare: hosting and HTTPS.
3. Google: YouTube Live and optional Gemini API.
4. Resend: inquiry email delivery.

### Important free-tier limits

Limits can change; check provider dashboards before launch.

| Service | Important free-tier limit |
| --- | --- |
| Supabase | 500 MB database, 1 GB Storage, 5 GB monthly uncached egress; inactive projects can pause. |
| Cloudflare Workers | Dynamic requests use the Workers Free quota. Check the dashboard for current request and CPU limits. |
| Resend | 100 emails/day and 3,000/month. |
| Gemini | Quotas vary by model/account; the chatbot falls back to FAQ responses. |
| YouTube Live | Free subject to channel eligibility and policies. Unlisted links are not private. |

## Local setup

1. Install Node.js 22 or current Node LTS.
2. Run:

   ```powershell
   npm install
   Copy-Item .env.example .env.local
   ```

3. Fill in `.env.local`. Never commit it.
4. Start the site:

   ```powershell
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Supabase setup

1. Create a free project at [Supabase](https://supabase.com/dashboard).
2. In **Project Settings → API**, copy:
   - Project URL to `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - Publishable key to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Service-role key to `SUPABASE_SERVICE_ROLE_KEY` (never expose this in browser code).
3. Apply database schema and subsequent migrations:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   For an already configured Supabase project, apply new migration files before deploying code that depends on them. The admission form requires `supabase/migrations/20260928010000_public_inquiry_submission.sql`; run its contents once in the Supabase **SQL Editor** if you are not using the Supabase CLI.

   Website content editing requires `supabase/migrations/20260929010000_website_content.sql`. Run that migration in the SQL Editor before deploying the Website Content admin page.

4. In hosted Supabase Auth settings, match [supabase/config.toml](./supabase/config.toml):
   - Disable public and email signup.
   - Require email confirmation.
   - Require secure reauthentication for password changes.
   - Require a 12+ character password with upper/lowercase, number, and symbol.
5. Create the initial Principal/Admin manually in **Authentication → Users**. Then run, after replacing the email:

   ```sql
   update public.profiles
   set role = 'principal_admin'
   where id = (select id from auth.users where email = 'REPLACE_WITH_ADMIN_EMAIL');
   ```

6. Create staff only through administrator-controlled invitations/service-role tooling, then explicitly set approved users to `staff`. Never enable public signup.
7. Optional dummy seed data:

   ```powershell
   $env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
   npm run seed
   ```

## Deploy to Cloudflare Workers from GitHub

**Important:** This application uses Next.js server routes, authentication, and middleware. Deploy it as a **Cloudflare Worker using OpenNext**, not as a Cloudflare Pages static site. If a Cloudflare log says the Wrangler configuration is invalid for Pages or asks for `pages_build_output_dir`, the project was created as Pages; create/import it under **Workers & Pages → Create application → Import a repository** as a Worker instead.

1. In Cloudflare, open **Workers & Pages → Create application → Get started → Import a repository**. Connect GitHub and select `dipak2907-het/ShantiGlobalSchool`, branch `main`.
2. Set the Worker name to `shanti-global-school`, leave the root directory blank, and use:
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx wrangler deploy`
3. In **Build variables and secrets**, add these two **build variables** from Supabase → **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the Supabase publishable key

   These must be present during the build because Next.js embeds `NEXT_PUBLIC_` values in the browser bundle. Do not use a `service_role` or secret key here.
4. Start the first deployment. Cloudflare will show a free HTTPS `workers.dev` URL when the build succeeds.
5. In the Worker, open **Settings → Variables and Secrets** and add those same two values for runtime access. Add `SUPABASE_SERVICE_ROLE_KEY` as a **runtime secret** (not a build variable) from Supabase → **Project Settings → API**; the admission inquiry API needs it to call the protected database function. Never put this secret in GitHub, browser code, or a `NEXT_PUBLIC_` variable. Add `GEMINI_API_KEY` only if enabling the optional Gemini chatbot; otherwise chatbot FAQs still work.
6. Redeploy if prompted. Open the `workers.dev` address, check public pages, and try `/admin/login`.
7. In Supabase → **Authentication → URL Configuration**, set the Site URL to the new `workers.dev` URL and add it to the allowed Redirect URLs.

When Cloudflare Workers Builds is connected to GitHub, pushes to `main` trigger automatic deployments. See [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) and the [OpenNext adapter guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/).

### Deploy manually instead (not GitHub automatic deploy)

From PowerShell in the project folder, run `npx wrangler login`, then set local `.env.local` values and use `npm run preview` to test, followed by `npm run deploy`. Never commit `.env.local`.

## Resend, Gemini, and YouTube

### Resend

Create an API key and set `RESEND_API_KEY`. To use a school-branded sender address, verify an owned domain in Resend. Until then, use a permitted testing sender or leave inquiry email disabled.

### Gemini chatbot

Create an API key in Google AI Studio and set `GEMINI_API_KEY`. The default is `gemini-2.5-flash`; use `GEMINI_MODEL` only when intentionally selecting another available model. Without a key or quota, the chatbot uses FAQs and directs visitors to the office.

### YouTube Live

1. Verify the channel and enable Live; first activation can take up to 24 hours.
2. Schedule an **Unlisted** stream and allow embedding.
3. In **Admin → Go live**, enter:

   ```text
   https://www.youtube.com/embed/VIDEO_ID
   ```

4. Start/End Live controls the public banner and player.

## Backups

Supabase Free does not offer downloadable backups or point-in-time recovery. At least weekly:

1. Export database:

   ```powershell
   npx supabase db dump --project-ref YOUR_PROJECT_REF > school-backup.sql
   ```

2. Download `school-media` Storage separately from Supabase.
3. Export students/inquiries once their admin exports are enabled.
4. Store encrypted copies away from the hosting account.
5. Test a restore before relying on backups.

## How to change things

| Change | File |
| --- | --- |
| Name, session, address, phone, email, colors, map, principal message | [src/config/school.ts](./src/config/school.ts) |
| FAQ, dummy text, public placeholder content | [src/config/school.ts](./src/config/school.ts) |
| Public school details, homepage, principal, About, map, and admission copy | Admin → Website content (Principal/Admin only; requires the website-content migration) |
| Logo and placeholder images | [public/images/placeholders](./public/images/placeholders) |
| Tables and RLS | [supabase/migrations](./supabase/migrations) |
| Auth security | [supabase/config.toml](./supabase/config.toml) and Supabase dashboard |
| Security headers | [next.config.ts](./next.config.ts) |

## Things to change before launch

- [ ] Replace every `PLACEHOLDER` in [src/config/school.ts](./src/config/school.ts).
- [ ] Upload authorized original school, teacher, and gallery images.
- [ ] Add school contact details, principal message, vision, mission, history, and facilities.
- [ ] Add approved privacy and child-photo-consent policies.
- [ ] Apply Supabase migration and set hosted Auth settings.
- [ ] Create/verify the Principal/Admin account.
- [ ] Replace all dummy notices, events, holidays, FAQ items, teachers, and timetables.
- [ ] Confirm consent for every public child photo.
- [ ] Configure Resend, Gemini, and YouTube only when ready.
- [ ] Test login, inquiry, gallery upload, timetable, Live start/end, and chatbot fallback.
- [ ] Perform and test database and Storage backups.

## Validation

```powershell
npm run lint
npm run build
npm run preview
```
