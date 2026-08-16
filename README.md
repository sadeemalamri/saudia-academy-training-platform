# Saudia Academy — Training Program Application Platform

A web platform for managing training program applications — built for both
**students** (browse programs, apply, track application status, upload
documents) and **admins** (review applications, manage program requirements,
assign supervisors, manage jobs).

> This project was built as a portfolio piece to demonstrate front-end
> development and integration with a real backend (Supabase) for
> authentication and data storage.

## Features

- **Authentication** — sign in / forgot password flow via Supabase Auth
- **Student dashboard** — browse available programs, submit applications,
  upload required documents, track application status
- **Application workflow** — multi-step application form → document
  upload → review → submission confirmation
- **Admin dashboard** — manage applications, program requirements, jobs,
  and assign supervisors to students
- **Training plans** — view and manage assigned training plans
- **Settings** — user account settings
- **AI CV analysis** — on submission/review, a candidate's CV is scored
  against the program's required skills using OpenAI, via a separate
  FastAPI service (see [`docs/ai-services/cv-analysis-api`](docs/ai-services/cv-analysis-api))
- **AI chatbot** — in-app assistant to help users navigate the platform.
  The bundled `JS/chatbot.js` is a lightweight keyword-based demo; the
  production-intended version is a retrieval-augmented AI agent built in
  n8n (see [`docs/ai-services/chatbot-workflow-n8n`](docs/ai-services/chatbot-workflow-n8n))
- Role-based access (student vs. admin) enforced on the client via
  Supabase session/profile checks

## Tech Stack

- **HTML5 / CSS3** — semantic markup, custom styling per page
- **Vanilla JavaScript** (no framework) — one JS module per page
- **[Supabase](https://supabase.com/)** — authentication, database, and
  session management
- **[Lucide](https://lucide.dev/)** — icon set

## Project Structure

```
Project Analysis AI/
├── HTML/            # One HTML page per screen (login, dashboards, forms, etc.)
├── CSS/             # One stylesheet per page/component
├── JS/              # One script per page + shared Supabase client
│   ├── config.example.js   # Template for your own Supabase credentials
│   ├── config.js            # Your local credentials (git-ignored, not included)
│   └── supabaseClient.js    # Shared Supabase client + auth helpers
├── images/          # Static assets
└── package.json
```

## AI Services

Two AI-powered components support this platform but run as **separate
services**, not as part of this static site:

| Service | What it does | Location |
|---|---|---|
| CV Analysis API | FastAPI service that scores a CV against program requirements with OpenAI, stores results in Supabase | [`docs/ai-services/cv-analysis-api`](docs/ai-services/cv-analysis-api) |
| Chatbot (n8n workflow) | Retrieval-augmented AI agent (OpenAI + vector-store knowledge base) built in n8n | [`docs/ai-services/chatbot-workflow-n8n`](docs/ai-services/chatbot-workflow-n8n) |

See each folder's README for setup, deployment, and how it connects to
this front-end.

## Getting Started

This is a static front-end project — no build step required.

1. **Clone the repo**
   ```bash
   git clone <this-repo-url>
   cd "Project Analysis AI"
   ```

2. **Set up your Supabase credentials**

   The project needs a Supabase project (free tier works) for auth and data.

   - Copy the example config file:
     ```bash
     cp JS/config.example.js JS/config.js
     ```
   - Open `JS/config.js` and fill in your own project URL and anon/public
     key, found in your Supabase dashboard under **Project Settings → API**:
     ```js
     window.APP_CONFIG = {
       SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
       SUPABASE_ANON_KEY: "YOUR_ANON_PUBLIC_KEY"
     };
     ```
   - `JS/config.js` is git-ignored on purpose — never commit real credentials.

3. **Run it locally**

   Since this is static HTML/CSS/JS, any local static server works, e.g.:
   ```bash
   npx serve HTML
   ```
   or open `HTML/index.html` directly in your browser (some browser
   security settings may require a local server instead of `file://`).

## Notes on the Supabase Setup

This repo does **not** include the database schema (tables, RLS policies)
used in the original deployment. To run this against your own Supabase
project, you'll need to create tables such as `profiles`, `applications`,
and related tables referenced in `JS/*.js`, along with matching Row Level
Security (RLS) policies.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE)
for details.
