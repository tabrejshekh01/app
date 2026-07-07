import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { Sparkles, Check, AlertTriangle, TrendingUp, MapPin, ArrowRight } from "lucide-react";

const SAMPLE = `Alex Morgan
alex.morgan@email.com | linkedin.com/in/alexmorgan

Summary
Full-stack developer with 5 years of experience building React and Node.js applications. Shipped payment systems at scale (10M+ txns/mo) and led a team of 4 engineers.

Experience
Senior Full-Stack Engineer, FinFlow (2022 – Present)
- Built React + TypeScript dashboards for financial analytics
- Designed Postgres schemas and REST APIs handling 500 rps
- Reduced API p95 latency by 40% via query optimization

Software Engineer, ShopKit (2019 – 2022)
- Migrated Ruby on Rails monolith to microservices (Go)
- Built customer-facing checkout flow (Next.js)

Skills
JavaScript, TypeScript, React, Next.js, Node.js, Python, Postgres, AWS, Docker`;

export default function Analyzer() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const targetJobId = params.get("target");
  const [resume, setResume] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [targetJob, setTargetJob] = useState(null);

  useEffect(() => {
    if (targetJobId) {
      api.get(`/jobs/${targetJobId}`).then((r) => setTargetJob(r.data)).catch(() => {});
    }
  }, [targetJobId]);

  const analyze = async () => {
    if (!user) { nav("/login"); return; }
    if (resume.trim().length < 30) {
      toast.error("Paste at least 30 characters of your resume");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const payload = { resume_text: resume };
      if (targetJobId) payload.target_job_id = targetJobId;
      else if (targetRole) payload.target_role = targetRole;
      const r = await api.post("/ai/analyze-resume", payload);
      setResult(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-mono uppercase tracking-widest mb-4">
          <Sparkles className="w-3 h-3" /> Powered by Claude Sonnet 4.5
        </div>
        <h1 className="text-4xl sm:text-5xl font-medium tracking-tighter mb-3">AI Resume Analyzer</h1>
        <p className="text-stone-600 max-w-2xl mx-auto">Get an instant 0–100 score, personalized feedback, and the top jobs matched to your skills.</p>
      </div>

      {targetJob && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between" data-testid="target-job-banner">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-emerald-700">Targeting</div>
            <div className="font-medium">{targetJob.title} at {targetJob.company_name}</div>
          </div>
          <Sparkles className="w-5 h-5 text-emerald-700" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="relative rounded-2xl tracing-beam bg-white border border-stone-200 p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-2">Your resume</div>
          <Textarea
            data-testid="resume-input"
            rows={16}
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your full resume text here..."
            className="min-h-[380px] font-mono text-xs"
          />
          <div className="mt-2 flex items-center justify-between">
            <button onClick={() => setResume(SAMPLE)} className="text-xs text-orange-600 hover:underline underline-offset-4" data-testid="load-sample-btn">
              Load sample resume
            </button>
            <span className="text-xs text-stone-400 font-mono">{resume.length} chars</span>
          </div>

          {!targetJob && (
            <div className="mt-4">
              <div className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-2">Target role (optional)</div>
              <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Senior React Developer" data-testid="target-role-input" />
            </div>
          )}

          <Button
            onClick={analyze}
            disabled={loading}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_20px_rgba(5,150,105,0.25)]"
            data-testid="analyze-btn"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-white/30 animate-pulse" /> Analyzing with AI...
              </span>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Analyze my resume</>
            )}
          </Button>
        </div>

        {/* RESULTS */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center bg-white/50 border border-dashed border-stone-300 rounded-2xl p-8">
              <Sparkles className="w-8 h-8 text-stone-300 mb-3" strokeWidth={1.5} />
              <div className="text-stone-500 text-sm">Your AI-powered analysis will appear here.</div>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white border border-stone-200 rounded-2xl p-8 space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              <div className="text-sm text-stone-600">Claude is analyzing your resume...</div>
            </div>
          )}

          {result && (
            <>
              <div className="bg-white border border-stone-200 rounded-2xl p-6" data-testid="score-card">
                <div className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-2">Overall score</div>
                <div className="flex items-baseline gap-3">
                  <div className="font-heading text-6xl font-medium text-emerald-600" data-testid="score-value">{result.score}</div>
                  <div className="text-stone-400 text-xl">/100</div>
                </div>
                <div className="mt-3 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 transition-all duration-1000" style={{ width: `${result.score}%` }} />
                </div>
                <p className="mt-4 text-sm text-stone-700 leading-relaxed">{result.summary}</p>
              </div>

              {result.target_match && (
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl p-6" data-testid="target-match-card">
                  <div className="text-xs font-mono uppercase tracking-widest text-emerald-200 mb-2">Match with target job</div>
                  <div className="flex items-center gap-4">
                    <div className="font-heading text-5xl font-medium">{result.target_match.match_score}%</div>
                    <div>
                      <div className="font-medium">{result.target_match.job.title}</div>
                      <div className="text-sm text-emerald-100">{result.target_match.job.company_name}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <FeedbackCard title="Strengths" icon={Check} tone="emerald" items={result.strengths} testid="strengths-list" />
                <FeedbackCard title="Weaknesses" icon={AlertTriangle} tone="orange" items={result.weaknesses} testid="weaknesses-list" />
              </div>

              <div className="bg-white border border-stone-200 rounded-2xl p-6" data-testid="skills-card">
                <div className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-3 inline-flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Skill suggestions
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.skill_suggestions.map((s) => (
                    <span key={s} className="text-sm bg-orange-50 border border-orange-200 text-orange-700 rounded-md px-3 py-1">{s}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MATCHED JOBS */}
      {result?.matched_jobs?.length > 0 && (
        <div className="mt-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-orange-600 mb-2">For you</div>
              <h2 className="text-3xl font-medium tracking-tight">Top matched jobs</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.matched_jobs.map((job) => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="hover-lift bg-white border border-stone-200 rounded-xl p-5 block" data-testid={`matched-${job.id}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-md bg-stone-100 flex items-center justify-center text-xs font-medium">{job.company_name[0]}</div>
                  <span className="text-sm text-stone-600">{job.company_name}</span>
                </div>
                <h3 className="font-heading text-lg font-medium mb-2">{job.title}</h3>
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                  <span className="text-orange-600 font-mono">${(job.salary_min/1000).toFixed(0)}k+</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackCard({ title, icon: Icon, tone, items, testid }) {
  const toneClasses = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-600" },
    orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-600" },
  }[tone];
  return (
    <div className={`bg-white border border-stone-200 rounded-2xl p-5`} data-testid={testid}>
      <div className={`text-xs font-mono uppercase tracking-widest ${toneClasses.text} mb-3 inline-flex items-center gap-1.5`}>
        <Icon className="w-3 h-3" /> {title}
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it} className="text-sm text-stone-700 flex gap-2 leading-relaxed">
            <span className={`w-1.5 h-1.5 rounded-full ${toneClasses.dot} mt-2 shrink-0`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
