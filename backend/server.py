from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import logging
import json
import re
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt as pyjwt

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------- Config ----------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
JWT_ALGO = "HS256"
JWT_EXPIRE_HOURS = 24 * 7

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

app = FastAPI(title="JobHub AI")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("jobhub")


# ---------- Models ----------
Role = Literal["seeker", "employer"]


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: Role
    company_name: Optional[str] = None
    headline: Optional[str] = None
    created_at: datetime


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: Role
    company_name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    token: str
    user: UserOut


class JobIn(BaseModel):
    title: str
    description: str
    category: str
    location: str
    job_type: Literal["Full-time", "Part-time", "Contract", "Internship", "Remote"]
    experience: Literal["Entry", "Mid", "Senior", "Lead"]
    salary_min: int = 0
    salary_max: int = 0
    skills: List[str] = []


class JobOut(BaseModel):
    id: str
    employer_id: str
    company_name: str
    title: str
    description: str
    category: str
    location: str
    job_type: str
    experience: str
    salary_min: int
    salary_max: int
    skills: List[str]
    created_at: datetime
    applicants_count: int = 0


class ApplicationIn(BaseModel):
    cover_note: Optional[str] = ""
    resume_text: Optional[str] = ""


class ApplicationOut(BaseModel):
    id: str
    job_id: str
    seeker_id: str
    seeker_name: str
    seeker_email: str
    cover_note: str
    resume_text: str
    status: Literal["pending", "accepted", "rejected"] = "pending"
    match_score: Optional[int] = None
    created_at: datetime
    job: Optional[JobOut] = None


class AnalyzeIn(BaseModel):
    resume_text: str = Field(min_length=30)
    target_job_id: Optional[str] = None
    target_role: Optional[str] = None


class AnalyzeOut(BaseModel):
    score: int
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    skill_suggestions: List[str]
    matched_jobs: List[JobOut] = []
    target_match: Optional[dict] = None


# ---------- Utils ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(dt: datetime) -> str:
    return dt.isoformat()


def parse_dt(v):
    if isinstance(v, datetime):
        return v
    if isinstance(v, str):
        return datetime.fromisoformat(v)
    return now_utc()


def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": now_utc() + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": now_utc(),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def user_to_out(u: dict) -> UserOut:
    return UserOut(
        id=u["id"],
        email=u["email"],
        name=u["name"],
        role=u["role"],
        company_name=u.get("company_name"),
        headline=u.get("headline"),
        created_at=parse_dt(u["created_at"]),
    )


def job_to_out(j: dict, applicants_count: int = 0) -> JobOut:
    return JobOut(
        id=j["id"],
        employer_id=j["employer_id"],
        company_name=j["company_name"],
        title=j["title"],
        description=j["description"],
        category=j["category"],
        location=j["location"],
        job_type=j["job_type"],
        experience=j["experience"],
        salary_min=j.get("salary_min", 0),
        salary_max=j.get("salary_max", 0),
        skills=j.get("skills", []),
        created_at=parse_dt(j["created_at"]),
        applicants_count=applicants_count,
    )


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=401, detail="User not found")
    return u


def require_role(role: Role):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] != role:
            raise HTTPException(status_code=403, detail=f"Requires {role} role")
        return user
    return _dep


# ---------- Auth ----------
@api_router.post("/auth/register", response_model=TokenOut)
async def register(data: RegisterIn):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if data.role == "employer" and not data.company_name:
        raise HTTPException(status_code=400, detail="Company name required for employers")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "email": data.email.lower(),
        "name": data.name,
        "role": data.role,
        "company_name": data.company_name,
        "headline": None,
        "password_hash": pwd_context.hash(data.password),
        "created_at": to_iso(now_utc()),
    }
    await db.users.insert_one(doc)
    return TokenOut(token=make_token(uid), user=user_to_out(doc))


@api_router.post("/auth/login", response_model=TokenOut)
async def login(data: LoginIn):
    u = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not u or not pwd_context.verify(data.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenOut(token=make_token(u["id"]), user=user_to_out(u))


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return user_to_out(user)


# ---------- Jobs ----------
@api_router.post("/jobs", response_model=JobOut)
async def create_job(data: JobIn, user: dict = Depends(require_role("employer"))):
    jid = str(uuid.uuid4())
    doc = {
        "id": jid,
        "employer_id": user["id"],
        "company_name": user.get("company_name") or user["name"],
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "location": data.location,
        "job_type": data.job_type,
        "experience": data.experience,
        "salary_min": data.salary_min,
        "salary_max": data.salary_max,
        "skills": data.skills,
        "created_at": to_iso(now_utc()),
    }
    await db.jobs.insert_one(doc)
    return job_to_out(doc, 0)


@api_router.get("/jobs", response_model=dict)
async def list_jobs(
    q: Optional[str] = None,
    location: Optional[str] = None,
    category: Optional[str] = None,
    job_type: Optional[str] = None,
    experience: Optional[str] = None,
    salary_min: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
):
    query: dict = {}
    if q:
        query["$or"] = [
            {"title": {"$regex": re.escape(q), "$options": "i"}},
            {"description": {"$regex": re.escape(q), "$options": "i"}},
            {"skills": {"$regex": re.escape(q), "$options": "i"}},
            {"company_name": {"$regex": re.escape(q), "$options": "i"}},
        ]
    if location:
        query["location"] = {"$regex": re.escape(location), "$options": "i"}
    if category:
        query["category"] = category
    if job_type:
        query["job_type"] = job_type
    if experience:
        query["experience"] = experience
    if salary_min:
        query["salary_max"] = {"$gte": salary_min}

    total = await db.jobs.count_documents(query)
    cursor = db.jobs.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
    jobs = await cursor.to_list(page_size)
    # applicant counts
    ids = [j["id"] for j in jobs]
    counts = {}
    if ids:
        pipeline = [{"$match": {"job_id": {"$in": ids}}}, {"$group": {"_id": "$job_id", "c": {"$sum": 1}}}]
        async for row in db.applications.aggregate(pipeline):
            counts[row["_id"]] = row["c"]
    return {
        "items": [job_to_out(j, counts.get(j["id"], 0)).model_dump() for j in jobs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@api_router.get("/jobs/featured", response_model=List[JobOut])
async def featured_jobs():
    cursor = db.jobs.find({}, {"_id": 0}).sort("created_at", -1).limit(6)
    jobs = await cursor.to_list(6)
    return [job_to_out(j) for j in jobs]


@api_router.get("/jobs/categories", response_model=List[dict])
async def job_categories():
    pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    cats = []
    async for row in db.jobs.aggregate(pipeline):
        if row["_id"]:
            cats.append({"category": row["_id"], "count": row["count"]})
    return cats


@api_router.get("/jobs/companies", response_model=List[dict])
async def top_companies():
    pipeline = [{"$group": {"_id": "$company_name", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}, {"$limit": 8}]
    out = []
    async for row in db.jobs.aggregate(pipeline):
        if row["_id"]:
            out.append({"company_name": row["_id"], "open_jobs": row["count"]})
    return out


@api_router.get("/jobs/stats", response_model=dict)
async def stats():
    return {
        "total_jobs": await db.jobs.count_documents({}),
        "total_seekers": await db.users.count_documents({"role": "seeker"}),
        "total_employers": await db.users.count_documents({"role": "employer"}),
        "total_applications": await db.applications.count_documents({}),
    }


@api_router.get("/jobs/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    j = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    count = await db.applications.count_documents({"job_id": job_id})
    return job_to_out(j, count)


@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(require_role("employer"))):
    j = await db.jobs.find_one({"id": job_id})
    if not j:
        raise HTTPException(status_code=404, detail="Not found")
    if j["employer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job")
    await db.jobs.delete_one({"id": job_id})
    await db.applications.delete_many({"job_id": job_id})
    return {"ok": True}


# ---------- Applications ----------
@api_router.post("/jobs/{job_id}/apply", response_model=ApplicationOut)
async def apply_job(job_id: str, data: ApplicationIn, user: dict = Depends(require_role("seeker"))):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    existing = await db.applications.find_one({"job_id": job_id, "seeker_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")
    aid = str(uuid.uuid4())
    doc = {
        "id": aid,
        "job_id": job_id,
        "seeker_id": user["id"],
        "seeker_name": user["name"],
        "seeker_email": user["email"],
        "cover_note": data.cover_note or "",
        "resume_text": data.resume_text or "",
        "status": "pending",
        "match_score": None,
        "created_at": to_iso(now_utc()),
    }
    await db.applications.insert_one(doc)
    return ApplicationOut(**{**doc, "created_at": parse_dt(doc["created_at"]), "job": job_to_out(job)})


@api_router.get("/my/applications", response_model=List[ApplicationOut])
async def my_applications(user: dict = Depends(require_role("seeker"))):
    cursor = db.applications.find({"seeker_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    apps = await cursor.to_list(200)
    out = []
    for a in apps:
        job = await db.jobs.find_one({"id": a["job_id"]}, {"_id": 0})
        out.append(ApplicationOut(**{**a, "created_at": parse_dt(a["created_at"]), "job": job_to_out(job) if job else None}))
    return out


@api_router.get("/my/jobs", response_model=List[JobOut])
async def my_jobs(user: dict = Depends(require_role("employer"))):
    cursor = db.jobs.find({"employer_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    jobs = await cursor.to_list(200)
    result = []
    for j in jobs:
        count = await db.applications.count_documents({"job_id": j["id"]})
        result.append(job_to_out(j, count))
    return result


@api_router.get("/jobs/{job_id}/applicants", response_model=List[ApplicationOut])
async def job_applicants(job_id: str, user: dict = Depends(require_role("employer"))):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Not found")
    if job["employer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job")
    cursor = db.applications.find({"job_id": job_id}, {"_id": 0}).sort("created_at", -1)
    apps = await cursor.to_list(200)
    return [ApplicationOut(**{**a, "created_at": parse_dt(a["created_at"])}) for a in apps]


@api_router.patch("/applications/{app_id}/status")
async def update_app_status(app_id: str, payload: dict, user: dict = Depends(require_role("employer"))):
    new_status = payload.get("status")
    if new_status not in ("accepted", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status")
    a = await db.applications.find_one({"id": app_id})
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    job = await db.jobs.find_one({"id": a["job_id"]})
    if not job or job["employer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.applications.update_one({"id": app_id}, {"$set": {"status": new_status}})
    return {"ok": True, "status": new_status}


# ---------- AI Resume Analyzer ----------
def _extract_json(text: str) -> dict:
    text = text.strip()
    # remove markdown fences
    text = re.sub(r"^```(?:json)?", "", text).rstrip("`").strip()
    # find first {...} block
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        text = m.group(0)
    return json.loads(text)


async def _ai_analyze(resume_text: str, target_role: Optional[str] = None, target_job: Optional[dict] = None) -> dict:
    context = ""
    if target_job:
        context = (
            f"\n\nThe candidate is targeting this specific job:\n"
            f"Title: {target_job['title']}\n"
            f"Company: {target_job['company_name']}\n"
            f"Required skills: {', '.join(target_job.get('skills', []))}\n"
            f"Description: {target_job['description'][:500]}"
        )
    elif target_role:
        context = f"\n\nThe candidate is targeting the role: {target_role}"

    system = (
        "You are an expert career coach and technical recruiter. Analyze resumes with precision. "
        "Return ONLY valid JSON, no markdown, no prose outside the JSON."
    )
    prompt = f"""Analyze this resume and return a JSON object with EXACTLY these keys:
{{
  "score": <integer 0-100 overall resume quality>,
  "summary": "<2-sentence assessment>",
  "strengths": ["<3-5 short bullets>"],
  "weaknesses": ["<2-4 short bullets>"],
  "skill_suggestions": ["<3-6 concrete skills to learn>"]
}}

Resume:
\"\"\"
{resume_text[:6000]}
\"\"\"{context}

Return only the JSON object."""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"resume-{uuid.uuid4()}",
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    resp = await chat.send_message(UserMessage(text=prompt))
    text = resp if isinstance(resp, str) else str(resp)
    data: dict = {}
    try:
        data = _extract_json(text)
    except Exception as e:
        logger.error(f"AI parse error: {e} :: {text[:400]}")
        raise HTTPException(status_code=502, detail="AI analysis failed to parse")

    # Coerce
    data["score"] = int(max(0, min(100, data.get("score", 0))))
    for k in ("strengths", "weaknesses", "skill_suggestions"):
        v = data.get(k, [])
        if not isinstance(v, list):
            v = [str(v)]
        data[k] = [str(x) for x in v][:8]
    data["summary"] = str(data.get("summary", ""))[:600]
    return data


def _match_score(resume_text: str, job: dict) -> int:
    resume_low = resume_text.lower()
    skills = job.get("skills") or []
    if not skills:
        # fallback: match against title tokens
        tokens = [t for t in re.split(r"\W+", job.get("title", "").lower()) if len(t) > 3]
        if not tokens:
            return 50
        hits = sum(1 for t in tokens if t in resume_low)
        return int(min(100, 40 + (hits / len(tokens)) * 60))
    hits = sum(1 for s in skills if s.lower() in resume_low)
    return int(min(100, 30 + (hits / len(skills)) * 70))


@api_router.post("/ai/analyze-resume", response_model=AnalyzeOut)
async def analyze_resume(data: AnalyzeIn, user: dict = Depends(get_current_user)):
    target_job = None
    if data.target_job_id:
        target_job = await db.jobs.find_one({"id": data.target_job_id}, {"_id": 0})

    ai = await _ai_analyze(data.resume_text, target_role=data.target_role, target_job=target_job)

    # Match against recent jobs for recommendations
    cursor = db.jobs.find({}, {"_id": 0}).sort("created_at", -1).limit(30)
    jobs_pool = await cursor.to_list(30)
    scored = [(j, _match_score(data.resume_text, j)) for j in jobs_pool]
    scored.sort(key=lambda x: -x[1])
    matched = [job_to_out(j) for j, s in scored[:6]]

    target_match = None
    if target_job:
        target_match = {
            "job": job_to_out(target_job).model_dump(),
            "match_score": _match_score(data.resume_text, target_job),
        }

    # Persist analysis
    await db.resume_analyses.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "score": ai["score"],
        "created_at": to_iso(now_utc()),
    })

    return AnalyzeOut(
        score=ai["score"],
        summary=ai["summary"],
        strengths=ai["strengths"],
        weaknesses=ai["weaknesses"],
        skill_suggestions=ai["skill_suggestions"],
        matched_jobs=matched,
        target_match=target_match,
    )


# ---------- Seed ----------
SEED_JOBS = [
    {"title": "Senior Frontend Engineer", "company_name": "Vercel Labs", "category": "Engineering", "location": "Remote", "job_type": "Full-time", "experience": "Senior", "salary_min": 130000, "salary_max": 180000, "skills": ["React", "TypeScript", "Next.js", "Tailwind"], "description": "Build the next generation of web experiences. You'll ship production React and Next.js at scale, own performance budgets, and collaborate with a small, senior team."},
    {"title": "Product Designer", "company_name": "Linear Studio", "category": "Design", "location": "New York, NY", "job_type": "Full-time", "experience": "Mid", "salary_min": 110000, "salary_max": 150000, "skills": ["Figma", "Design Systems", "Prototyping", "User Research"], "description": "Craft beautiful, intuitive product interfaces. Own end-to-end design from research to shipped pixels."},
    {"title": "Machine Learning Engineer", "company_name": "Anthropic Ventures", "category": "AI/ML", "location": "San Francisco, CA", "job_type": "Full-time", "experience": "Senior", "salary_min": 180000, "salary_max": 260000, "skills": ["Python", "PyTorch", "LLMs", "MLOps"], "description": "Train and deploy large language models. Work on evaluation, fine-tuning, and safety."},
    {"title": "Backend Engineer (Go)", "company_name": "Ramp Systems", "category": "Engineering", "location": "Remote", "job_type": "Full-time", "experience": "Mid", "salary_min": 120000, "salary_max": 160000, "skills": ["Go", "PostgreSQL", "gRPC", "Kubernetes"], "description": "Build high-throughput financial systems. Own services from API design to production."},
    {"title": "Growth Marketing Lead", "company_name": "Stripe Inc", "category": "Marketing", "location": "Austin, TX", "job_type": "Full-time", "experience": "Lead", "salary_min": 140000, "salary_max": 190000, "skills": ["SEO", "Paid Ads", "Analytics", "Content Strategy"], "description": "Drive user acquisition across paid, organic, and lifecycle channels. Own the growth funnel end-to-end."},
    {"title": "iOS Developer", "company_name": "Notion Labs", "category": "Engineering", "location": "Remote", "job_type": "Contract", "experience": "Mid", "salary_min": 90000, "salary_max": 130000, "skills": ["Swift", "SwiftUI", "Combine", "Xcode"], "description": "Ship polished iOS experiences. Collaborate closely with product and design."},
    {"title": "DevOps Engineer", "company_name": "Vercel Labs", "category": "Engineering", "location": "Remote", "job_type": "Full-time", "experience": "Senior", "salary_min": 140000, "salary_max": 190000, "skills": ["AWS", "Terraform", "Docker", "CI/CD"], "description": "Own cloud infrastructure, scalability, and reliability across our platform."},
    {"title": "Data Scientist", "company_name": "Ramp Systems", "category": "Data", "location": "New York, NY", "job_type": "Full-time", "experience": "Mid", "salary_min": 130000, "salary_max": 170000, "skills": ["Python", "SQL", "Pandas", "Statistics"], "description": "Turn transactional data into product insights. Build dashboards and predictive models."},
    {"title": "Technical Writer", "company_name": "Stripe Inc", "category": "Content", "location": "Remote", "job_type": "Part-time", "experience": "Entry", "salary_min": 60000, "salary_max": 90000, "skills": ["Documentation", "Developer Tools", "Markdown"], "description": "Create clear, accurate developer documentation. Work directly with engineering."},
    {"title": "Founding Engineer", "company_name": "Anthropic Ventures", "category": "Engineering", "location": "San Francisco, CA", "job_type": "Full-time", "experience": "Lead", "salary_min": 200000, "salary_max": 320000, "skills": ["Python", "React", "Distributed Systems", "LLMs"], "description": "Join as employee #5. Own critical infrastructure and product direction."},
    {"title": "UX Researcher", "company_name": "Linear Studio", "category": "Design", "location": "London, UK", "job_type": "Full-time", "experience": "Mid", "salary_min": 90000, "salary_max": 130000, "skills": ["User Interviews", "Usability Testing", "Data Analysis"], "description": "Uncover deep user insights and shape product strategy."},
    {"title": "QA Engineer", "company_name": "Notion Labs", "category": "Engineering", "location": "Remote", "job_type": "Full-time", "experience": "Entry", "salary_min": 70000, "salary_max": 100000, "skills": ["Playwright", "Cypress", "Test Automation"], "description": "Automate testing across web and mobile. Guard the release pipeline."},
]


@api_router.post("/seed")
async def seed(force: bool = False):
    existing = await db.users.count_documents({})
    if existing and not force:
        return {"seeded": False, "reason": "already seeded", "users": existing}

    await db.users.delete_many({})
    await db.jobs.delete_many({})
    await db.applications.delete_many({})
    await db.resume_analyses.delete_many({})

    # Demo accounts
    demo_seeker_id = str(uuid.uuid4())
    demo_employer_id = str(uuid.uuid4())
    await db.users.insert_many([
        {
            "id": demo_seeker_id, "email": "seeker@demo.com", "name": "Alex Morgan",
            "role": "seeker", "company_name": None, "headline": "Full-stack developer",
            "password_hash": pwd_context.hash("demo1234"), "created_at": to_iso(now_utc()),
        },
        {
            "id": demo_employer_id, "email": "employer@demo.com", "name": "Jamie Rivera",
            "role": "employer", "company_name": "Vercel Labs", "headline": "Head of Talent",
            "password_hash": pwd_context.hash("demo1234"), "created_at": to_iso(now_utc()),
        },
    ])

    # Seed jobs — assign to a rotating pool of employers so each company has jobs
    company_to_employer = {}
    for i, jd in enumerate(SEED_JOBS):
        cn = jd["company_name"]
        if cn not in company_to_employer:
            if cn == "Vercel Labs":
                company_to_employer[cn] = demo_employer_id
            else:
                eid = str(uuid.uuid4())
                await db.users.insert_one({
                    "id": eid,
                    "email": f"employer{i}@demo.com",
                    "name": f"{cn} Recruiter",
                    "role": "employer",
                    "company_name": cn,
                    "headline": "Hiring Manager",
                    "password_hash": pwd_context.hash("demo1234"),
                    "created_at": to_iso(now_utc()),
                })
                company_to_employer[cn] = eid
        job_doc = {
            "id": str(uuid.uuid4()),
            "employer_id": company_to_employer[cn],
            **jd,
            "created_at": to_iso(now_utc() - timedelta(days=i)),
        }
        await db.jobs.insert_one(job_doc)

    return {"seeded": True, "jobs": len(SEED_JOBS), "demo": {"seeker": "seeker@demo.com / demo1234", "employer": "employer@demo.com / demo1234"}}


@api_router.get("/")
async def root():
    return {"message": "JobHub AI API", "version": "1.0"}


# ---------- App wiring ----------
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.jobs.create_index("created_at")
    await db.applications.create_index([("job_id", 1), ("seeker_id", 1)], unique=True)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
