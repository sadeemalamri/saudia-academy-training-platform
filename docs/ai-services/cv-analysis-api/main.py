# ==========================================
# AI CV Analyzer API
# ==========================================
# Receives an application_id + program_requirements_id, downloads the
# applicant's CV from Supabase Storage, compares it against the program's
# required skills using OpenAI, and stores the result back in Supabase.
#
# This is the service called by the main site's JS (application-overview.js
# / review.js) at POST /analyze-cv.
#
# Converted from the original Colab notebook (Ai_Agent.ipynb) for
# deployment as a standalone FastAPI service (e.g. on Render).
# ==========================================

import io
import json
from datetime import datetime, timezone

import pdfplumber
import requests
import uvicorn
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import Client, create_client

from config import (
    ALLOWED_ORIGINS,
    OPENAI_API_KEY,
    SUPABASE_KEY,
    SUPABASE_URL,
)

# ==========================================
# 1. FastAPI app setup
# ==========================================
app = FastAPI(
    title="AI CV Analyzer API",
    description="Analyzes candidate CVs against program requirements and stores the result in Supabase.",
    version="1.0.0",
)

# CORS — the static front-end (served from a different origin, e.g. GitHub
# Pages or localhost) calls this API directly from the browser, so it must
# be allowed explicitly or every request will be blocked by the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


class AnalysisRequest(BaseModel):
    application_id: str
    program_requirements_id: str


# ==========================================
# 2. Extract text from a PDF file (bytes)
# ==========================================
def extract_text_from_pdf_stream(pdf_bytes: bytes) -> str:
    if not pdf_bytes:
        return ""
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            return "".join(
                page.extract_text() for page in pdf.pages if page.extract_text()
            )
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""


# ==========================================
# 3. Core matching + storage logic
# ==========================================
def run_ai_skills_analysis(application_id: str, program_requirements_id: str) -> bool:
    now_str = datetime.now(timezone.utc).isoformat()

    try:
        print("1. Fetching requirements and file path from Supabase...")

        prog_res = (
            supabase.table("program_requirements")
            .select("skills")
            .eq("id", program_requirements_id)
            .execute()
        )

        if not prog_res.data:
            raise Exception(
                f"No program requirements found for id: {program_requirements_id}"
            )

        required_skills = prog_res.data[0].get("skills")

        doc_res = (
            supabase.table("application_documents")
            .select("file_path")
            .eq("application_id", application_id)
            .ilike("file_path", "%cv%")
            .execute()
        )

        if doc_res.data:
            cv_file_path = doc_res.data[0].get("file_path")
        else:
            all_docs = (
                supabase.table("application_documents")
                .select("file_path")
                .eq("application_id", application_id)
                .execute()
            )
            if all_docs.data:
                cv_file_path = all_docs.data[0].get("file_path")
            else:
                raise Exception(
                    f"No documents found for application_id: {application_id}"
                )

        print("2. Downloading and reading the CV from Storage...")
        pdf_bytes = supabase.storage.from_("resumes").download(cv_file_path)
        cv_text = extract_text_from_pdf_stream(pdf_bytes)

        if not cv_text:
            raise Exception("Could not extract text from the uploaded PDF.")

        print("3. Sending the CV text and skills to the AI...")
        prompt = f"""
        You are an HR AI Matching Specialist.
        Analyze the candidate's CV against the required program skills.

        Program Required Skills:
        {required_skills}

        Candidate CV Text:
        {cv_text}

        Compare the CV with the required skills and output ONLY a raw JSON object matching this schema:
        {{
            "match_score": 95,
            "extracted_skills": ["Skill 1", "Skill 2"],
            "matched_skills": ["Skill 1"],
            "missing_skills": ["Skill 2"]
        }}
        """

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
        }

        response = requests.post(url, headers=headers, json=payload, timeout=60)

        if response.status_code != 200:
            raise Exception(f"OpenAI API error: {response.text}")

        raw_ai_text = response.json()["choices"][0]["message"]["content"].strip()

        clean_text = raw_ai_text
        if clean_text.startswith("```json"):
            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
        elif clean_text.startswith("```"):
            clean_text = clean_text.split("```")[1].split("```")[0].strip()

        parsed_data = json.loads(clean_text)

        print("4. Inserting the result into ai_skill_analysis...")

        insert_payload = {
            "application_id": application_id,
            "program_requirement_id": program_requirements_id,
            "extracted_skills": parsed_data.get("extracted_skills", []),
            "matched_skills": parsed_data.get("matched_skills", []),
            "missing_skills": parsed_data.get("missing_skills", []),
            "match_score": parsed_data.get("match_score", 0),
            "status": "completed",
            "raw_ai_response": raw_ai_text,
            "error_message": None,
            "analyzed_at": now_str,
            "created_at": now_str,
            "updated_at": now_str,
        }

        supabase.table("ai_skill_analysis").insert(insert_payload).execute()
        print("CV analyzed and result stored successfully.")
        return True

    except Exception as e:
        error_msg = str(e)
        print(f"Error: {error_msg}")

        try:
            failure_payload = {
                "application_id": application_id,
                "program_requirement_id": program_requirements_id,
                "status": "failed",
                "error_message": error_msg,
                "analyzed_at": now_str,
                "created_at": now_str,
                "updated_at": now_str,
            }
            supabase.table("ai_skill_analysis").insert(failure_payload).execute()
        except Exception as insert_err:
            print(f"Could not record the failure status: {insert_err}")

        return False


# ==========================================
# 4. FastAPI endpoints
# ==========================================
@app.get("/")
def read_root():
    return {"status": "online", "message": "AI CV Skills Analysis API is running!"}


@app.post("/analyze-cv")
async def analyze_cv_endpoint(data: AnalysisRequest, background_tasks: BackgroundTasks):
    """
    Receives the request from the front-end and runs the analysis in the
    background so the applicant's request doesn't have to wait for it.
    """
    if not data.application_id or not data.program_requirements_id:
        raise HTTPException(
            status_code=400,
            detail="Missing application_id or program_requirements_id",
        )

    background_tasks.add_task(
        run_ai_skills_analysis,
        data.application_id,
        data.program_requirements_id,
    )

    return {
        "status": "processing",
        "message": "CV analysis started successfully in the background",
        "application_id": data.application_id,
    }


# Local dev entry point — on Render, use the Procfile / start command instead.
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
