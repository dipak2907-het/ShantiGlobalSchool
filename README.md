# Shanti Global School website

Mobile-first school website for the 2026-27 session. Built with Next.js 16, React, TypeScript, Tailwind CSS, Supabase, and Cloudflare Workers using OpenNext.

This guide describes the current project behavior, setup, deployment, admin tasks, and known limitations. It is written for school staff and beginner developers.

## Important before public use

- Replace placeholder content using **Admin → Website content** after the database migration is applied. That page is restricted to Principal/Admin accounts.
- Replace the remaining code-managed placeholders in `src/config/school.ts`, especially chatbot FAQs and default content used before the first Website Content record is saved.
- Replace the approved privacy and child-photo-consent policy placeholders on `/privacy`; that page is currently code-managed, not editable from Admin.
- Obtain school approval for public content, the privacy notice, and photo publication consent.
- Student records and admission inquiries are private. Never publish student personal details.
- The public admission form saves inquiries for review in **Admin → Inquiries**. It does **not currently send an email notification** to the school.

## Free services and limits

The services below have free plans, but quotas and terms can change. Check the provider dashboard before launch.

| Service | Use | Notes |
| --- | --- | --- |
| Supabase | PostgreSQL, login, private photo storage, Realtime | Free-tier projects have storage, database, and bandwidth limits and may pause when inactive. |
| Cloudflare Workers | Website hosting and HTTPS | Uses the Workers Free quota; check the dashboard for current limits. Deploy this app as a Worker, not static Pages. |
| YouTube Live | Live video embed | Free subject to channel eligibility and YouTube policies. Unlisted links are not private. |
| Google Gemini | Optional chatbot answers | Optional API key; quotas vary. The chatbot has FAQ and office-contact fallback behavior. |

A free `workers.dev` address is provided by Cloudflare. A custom `.in` or `.com` domain normally costs money separately.

Free plans have quotas for database size, photo storage, data transfer, requests, and optional API usage. The exact allowances and inactivity rules can change, so check the current Supabase, Cloudflare, and Google plan dashboards before uploading large photo collections or using the chatbot/live stream at scale.

## Project map

- `src/app/` — public pages, admin pages, and API routes.
- `src/components/` — shared public, admin, and chatbot components.
- `src/config/school.ts` — school defaults, navigation, FAQs, seed content, and fallback placeholders.
- `src/lib/site-content.ts` — Website Content database record type and fallback values.
- `src/app/admin/` — protected admin screens.
- `supabase/migrations/` — ordered database, access-policy, and storage migrations.
- `scripts/seed.ts` — optional dummy-data seeding script; seeded entries are marked `PLACEHOLDER`.
- `public/images/placeholders/` — replaceable example images.
- `wrangler.jsonc` — Cloudflare Worker configuration.

## Public pages

| Page | URL | Current source |
| --- | --- | --- |
| Home | `/` | Website Content, published notices/events, and active live-event status |
| About | `/about` | Website Content |
| Teachers | `/teachers` | Public teacher records in Supabase |
| Gallery | `/gallery` | Published albums and consented photos in Supabase |
| Events | `/events` | Public events in Supabase |
| Holidays | `/holidays` | Public holidays in Supabase |
| Notices | `/notices` | Published notices in Supabase |
| Class timetable | `/class-timetable` | Timetable records in Supabase |
| Exam timetable | `/exam-timetable` | Exam timetable records in Supabase |
| Live event | `/live` | Active YouTube event in Supabase |
| Admission | `/admission` | Inquiry form; submissions are saved privately |
| Contact | `/contact` | Website Content |
| Privacy | `/privacy` | Privacy page content in the application |

## Admin roles and available forms

Sign in at `/admin/login`. Public sign-up is disabled. Only an approved Principal/Admin or Staff account should be used.

| Admin screen | Principal/Admin | Staff | What it manages |
| --- | :---: | :---: | --- |
| Dashboard | Yes | Yes | Links to common tasks |
| Notices | Yes | Yes | Create, publish/unpublish, mark urgent, set expiry, edit, and delete notices |
| Gallery | Yes | Yes | Create/edit albums, upload/add/remove photos, edit descriptions, publish/unpublish |
| Website content | Yes | No | School details, home page, principal message/images, About text, map, and admission copy |
| Teachers | Yes | No | Teacher name, qualification, experience, biography, photo, and public visibility |
| Students | Yes | No | Private student records, search, edit, delete, and CSV export |
| Events & holidays | Yes | No | Create, publish, edit, and delete events and holidays |
| Timetables | Yes | No | Class timetable grid and editable subject list |
| Go live | Yes | No | Start/end website live status, edit event details, and maintain recording links |
| Inquiries | Yes | No | Review, search, mark contacted/closed, delete, and export CSV |
| Activity log | Yes | No | Review recorded admin actions |
| Settings | Yes | Yes | Change the signed-in account password |

**Known limitation:** there is a public Exam Timetable page, but no exam timetable editor in the Admin panel yet. Do not promise staff that exam dates can be maintained from the current admin UI.

## Supabase setup

### 1. Create and configure a Supabase project

1. Create a project from the [Supabase dashboard](https://supabase.com/dashboard).
2. In **Project Settings → API**, copy the project URL and the **publishable** key.
3. Never expose a service-role key in browser code, `NEXT_PUBLIC_` variables, screenshots, or chat.

### 2. Apply database migrations

The migration files must be applied in filename order:

1. `20260924000000_initial_schema.sql`
2. `20260924010000_public_teacher_photo_access.sql`
3. `20260924020000_public_gallery_photo_access.sql`
4. `20260924030000_timetable_publishing.sql`
5. `20260928010000_public_inquiry_submission.sql`
6. `20260929010000_website_content.sql`

For a new project, the Supabase CLI workflow is:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

For an existing project, first establish which migrations are already applied. If this project was configured by pasting SQL into the Dashboard SQL Editor, the CLI may not know that migration history; do not blindly push old migrations into a live project. Apply only missing migration files, in order, using **SQL Editor → New query → paste file contents → Run**. Existing database tables, policies, or functions should not be recreated casually.

The Website Content admin screen requires migration `20260929010000_website_content.sql`. The SQL Editor should report success; “No rows returned” is normal for schema statements.

### 3. Configure authentication and create the Principal/Admin

1. In **Authentication → URL Configuration**, add the production `workers.dev` URL as the Site URL and an allowed redirect URL.
2. Follow the secure password, email-confirmation, and sign-up settings in `supabase/config.toml`. Do not enable public sign-up.
3. Create the initial user in **Authentication → Users**.
4. Promote the approved account in SQL Editor by replacing the email below:

   ```sql
   update public.profiles
   set role = 'principal_admin'
   where id = (
     select id from auth.users
     where email = 'REPLACE_WITH_ADMIN_EMAIL'
   );
   ```

5. Create/approve staff accounts only through administrator-controlled processes. Staff can manage notices and Gallery content only.

### 4. Optional dummy data

Only run the seed script against a project where you are comfortable creating demo records. It inserts entries explicitly named `PLACEHOLDER`; do not leave those public on the production website.

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_PRIVATE_SERVICE_ROLE_KEY"
npm run seed
```

Never commit the key or store it in a `NEXT_PUBLIC_` variable. Remove the PowerShell variables from the current terminal session when finished.

## Local development

1. Install Node.js 22 or another supported current LTS release.
2. In PowerShell, from the project folder:

   ```powershell
   npm install
   Copy-Item .env.example .env.local
   ```

3. Put your Supabase project URL and publishable key into `.env.local`. Never commit `.env.local`.
4. Run the local Next.js development server:

   ```powershell
   npm run dev
   ```

5. Visit `http://localhost:3000`.

`npm run preview` builds the Cloudflare version and runs it locally through Wrangler. Runtime values needed by Worker APIs must be provided as local Wrangler development variables/secrets (for example in a private `.dev.vars` file); browser `NEXT_PUBLIC_` values belong in `.env.local`. Never commit either local secrets file.

## Deploy to Cloudflare Workers from GitHub

This is a Next.js server application. Use **Cloudflare Workers with OpenNext**, not a static Cloudflare Pages project.

### Initial Workers Builds setup

1. In Cloudflare, open **Workers & Pages → Create application → Import a repository** and select `dipak2907-het/ShantiGlobalSchool`, branch `main`.
2. Use Worker name `shanti-global-school`; leave the repository root directory blank.
3. Set:
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx wrangler deploy`
4. In the **Builds** settings, set these non-secret build variables from Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL` — project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key.
5. Deploy the first build. Cloudflare provides a `workers.dev` URL.
6. In the Worker's **Production → Settings → Runtime variables and secrets**, configure:
   - `NEXT_PUBLIC_SUPABASE_URL` as a **Variable**.
   - `SUPABASE_SERVICE_ROLE_KEY` as a **Secret**. Use the project’s server-only service-role/secret key. Never expose it as a build variable or in Git.
7. Save/deploy the runtime changes. In **Deployments**, confirm the version with the new binding is the **Active deployment** and receives **100% traffic**. A newly created version can show 0% traffic until promoted; if so, promote the intended version, not rollback.
8. The publishable key is needed in **Builds** and as a runtime variable for browser Supabase features. Add it under Production runtime variables if the app’s browser features cannot read the build setting after deployment.
9. If enabling Gemini, configure `GEMINI_API_KEY` as a server-only runtime secret. Without it, the chatbot uses FAQ/live-data responses or tells visitors to contact the school office.

With Workers Builds connected, pushes to `main` trigger a build/deployment. Check **Deployments** and make sure the successful intended version is active with traffic before testing. Do not interpret the `ASSETS`-only Wrangler build summary as proof that runtime secrets are present.

### Manual deployment

From PowerShell in the project folder:

```powershell
npx wrangler login
npm run preview
npm run deploy
```

Manual deploys use Wrangler configuration and Cloudflare bindings/secrets; do not assume settings under Workers Builds are interchangeable with the separate Runtime bindings. Check the active production deployment after deploying.

## Editing the school website

### Website Content (Principal/Admin)

Open **Admin → Website content**. The Principal/Admin can edit school name/session/contact, logo, homepage title and introduction, hero image, principal name/message/photo, About vision/mission/history/facilities, Contact/map details, and admission-page heading/copy.

Upload images as JPEG, PNG, or WebP, up to 5 MB. Click **Save and publish website content**. Saved content is displayed from Supabase without a code deployment. The configured text in `src/config/school.ts` is fallback/default content before the first Website Content record exists.

### Notices, events, holidays, teachers, and students

- **Notices:** set the title, message, optional expiry, urgent flag, and Published checkbox.
- **Events & holidays:** add details and select Public to display the record on public pages.
- **Teachers:** add qualifications, years of experience, biography, photo, and select Show publicly. Teacher photos allow JPEG/PNG/WebP up to 5 MB.
- **Students:** records are private and only available to Principal/Admin. Search and export records carefully; CSV contains personal data.
- **Class timetable:** add/edit subjects, select a standard and section, fill the grid, and select Publish timetable before saving. Saturday has four periods; the interface blocks double-booking a teacher.
- **Exam timetable:** no Admin editor currently exists; the public page reads Supabase exam timetable data.

### Gallery photos and albums

1. Open **Admin → Gallery**.
2. Enter an album heading, event name/date, a short description, and select one photo or multiple photos. One image makes a one-photo album.
3. JPEG, PNG, or WebP only; maximum 5 MB per image and 20 images per upload.
4. To publish, select **Publish this album and its photos** and confirm you have permission to publish every photo. Leave the publish switch off to keep the album private.
5. Use **Edit** to change album details, add photos, change per-photo descriptions, remove photos, or publish/unpublish. An album must retain at least one photo.
6. The public Gallery groups photos under album headings, filters by year/event, and provides a photo viewer. Do not display children's photos without publication consent.

### Live video

The **Admin → Go live** screen controls whether the website displays a stream; it does not start the broadcast on YouTube.

1. Start/schedule the YouTube stream in YouTube Studio, enable embedding, and copy its video ID.
2. In Admin → Go live, use `https://www.youtube.com/embed/VIDEO_ID`, enter a title, and click **Start live**.
3. Check `/live` and the home page. Ending the event in the website Admin hides it from public pages; stop the actual broadcast separately in YouTube Studio.
4. Ended event records remain in Admin. Add the recording link after YouTube makes the recording available.

## Admission inquiries and email notifications

The public admission form posts to `/api/inquiries`, validates inputs, applies a honeypot and database-backed IP rate limit, and saves submissions through a protected Supabase function. Review them in **Admin → Inquiries**, mark status, or export CSV.

**Email notification is not implemented currently.** `RESEND_API_KEY` may appear in older local setup examples, but the application does not send admission notification emails. Do not rely on an email arriving; check Admin → Inquiries. A successful form response means the inquiry was saved, not emailed.

## Chatbot behavior

- FAQ text is currently in `schoolSeed.faqs` in `src/config/school.ts`; there is no Admin FAQ editor.
- The app can answer some live holiday and class-timetable queries from public Supabase data.
- If configured, the optional Gemini API can answer using the app's approved facts. Without an available API key/quota or when it cannot answer, it falls back to office contact details.
- Do not put personal student information or confidential policies into public chatbot FAQs.

## Backups and privacy

Free-tier backup features vary. Regularly export database data and separately preserve the `school-media` Storage files. Supabase Dashboard and CLI backup availability may depend on plan and current provider policy; verify current limits and test restore steps.

Treat exported students/inquiry CSV and database dumps as sensitive. Store encrypted copies with limited access. Do not post exports, access tokens, or service-role keys in GitHub issues, chat, or screenshots.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Worker build asks for `pages_build_output_dir` | App is likely configured as Pages. Deploy/import it as a Cloudflare Worker using OpenNext. |
| Public website shows placeholders after editing | Confirm the Website Content migration is applied, save the admin form, then refresh the public page. |
| Website Content admin screen errors on `site_settings` | Apply `20260929010000_website_content.sql` to the correct Supabase project. |
| Admission form reports temporarily unavailable | Check Production Runtime `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; inspect Worker Observability logs. Do not share secret values. |
| Runtime secret exists but inquiry API still says missing settings | Check Deployments: the version containing the runtime settings must be active and receive 100% traffic. |
| Inquiry form succeeds but no email arrives | Inquiries are stored in Admin; email notifications are not implemented. |
| Gallery photo is not public | Confirm album and photo are published and consent is confirmed; refresh the public Gallery. |
| Admin page denies access | Confirm login account has the expected role in `public.profiles`; Staff has restricted access. |
| YouTube player is blank | Confirm the actual YouTube stream is live, embedding is allowed, and the URL is in `/embed/VIDEO_ID` format. |

When sharing an error for help, provide the error text with personal information, IP addresses, passwords, and keys removed.

## Change and deploy checklist

- [ ] Apply all required Supabase migrations, including Website Content and inquiry submission.
- [ ] Create and test the Principal/Admin account; confirm public sign-up is disabled.
- [ ] Enter approved school copy, address, phone, email, maps, principal message, and images in Website Content.
- [ ] Replace code-managed FAQ/default placeholders in `src/config/school.ts`.
- [ ] Replace and approve the code-managed privacy and child-photo-consent text on `/privacy`.
- [ ] Remove placeholder notices/events/holidays/teachers and any seed demo data from public view.
- [ ] Confirm consent before publishing every child photo.
- [ ] Test admission submission and verify it appears in Admin → Inquiries. Remember there is no email notification yet.
- [ ] Test public pages, mobile layout, class timetable, gallery filters/lightbox, and live stream workflow.
- [ ] Verify Cloudflare’s latest Production deployment is successful and active at 100% traffic.
- [ ] Create and test secure database and Storage backups.

## Validation commands

```powershell
npm run lint
npm run build
npx opennextjs-cloudflare build
npm run preview
```

There is currently no dedicated automated unit/integration test suite in the repository. The lint and production build are the current automated validation checks.
