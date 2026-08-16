# AI CV Analyzer API

A small FastAPI service that scores a candidate's CV against a training
program's required skills, using OpenAI (`gpt-4o-mini`), and stores the
result in Supabase. It's called by the main site's `application-overview.js`
and `review.js` (`POST /analyze-cv`) when a student's application is
submitted or reviewed.

> Originally prototyped in Google Colab (`Ai_Agent.ipynb`); this folder is
> the cleaned-up version, structured for deployment as a standalone service
> (e.g. on Render), with secrets removed and CORS support added so the
> browser-based front-end can actually call it.

## How it works

1. `POST /analyze-cv` receives `application_id` and `program_requirements_id`.
2. It looks up the program's required skills and the applicant's CV file
   path in Supabase.
3. It downloads the CV PDF from Supabase Storage and extracts its text
   with `pdfplumber`.
4. It sends the CV text + required skills to OpenAI, asking for a
   structured JSON match score.
5. It stores the result (`match_score`, `matched_skills`, `missing_skills`,
   etc.) in the `ai_skill_analysis` table in Supabase.
6. The analysis runs as a background task, so the endpoint responds
   immediately with `"status": "processing"` — the front-end polls or
   re-fetches the row once it's ready.

## Fixes made vs. the original notebook

- **CORS was missing.** The front-end calls this API from a different
  origin (e.g. `https://yourusername.github.io`), so without CORS headers
  the browser blocks every request. `CORSMiddleware` was added, configurable
  via `ALLOWED_ORIGINS`.
- **Secrets were hard-coded as fallback values** (`os.getenv("KEY", "real-key-here")`).
  This meant the real OpenAI and Supabase keys shipped inside the source
  file. Config now lives in `config.py`, which reads **only** from
  environment variables and fails with a clear error if one is missing —
  no key is ever written into the code.
- **No deployment files.** Added `requirements.txt` and a `Procfile` so the
  service can actually be deployed (e.g. on Render) instead of only
  running as a notebook.

## Setup

```bash
cd docs/ai-services/cv-analysis-api
pip install -r requirements.txt
cp .env.example .env
# then fill in .env with your own Supabase and OpenAI credentials
python main.py
```

The API will be live at `http://localhost:8000`.

## Deploying (e.g. on Render)

1. Push this folder (or the whole repo) to GitHub.
2. Create a new **Web Service** on Render, pointing at this directory.
3. Build command: `pip install -r requirements.txt`
4. Start command is read from the `Procfile` automatically.
5. Add `SUPABASE_URL`, `SUPABASE_KEY`, `OPENAI_API_KEY`, and
   `ALLOWED_ORIGINS` under the service's **Environment** tab — never in
   the code.

## Required Supabase tables

This service assumes the following tables already exist (schema not
included in this repo):

- `program_requirements` — with a `skills` column
- `application_documents` — with `application_id` and `file_path`
- `ai_skill_analysis` — where results/failures are written
- A Storage bucket named `resumes` containing the uploaded CV PDFs
