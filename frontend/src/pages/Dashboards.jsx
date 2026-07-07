import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { toast } from "sonner";
import { Briefcase, Plus, Trash2, Users, ChevronRight, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";

const CATEGORIES = ["Engineering", "Design", "AI/ML", "Marketing", "Data", "Content"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Remote"];
const EXPERIENCE = ["Entry", "Mid", "Senior", "Lead"];

export function SeekerDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { nav("/login"); return; }
    if (user.role !== "seeker") { nav("/dashboard/employer"); return; }
    api.get("/my/applications").then((r) => setApps(r.data)).finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const statusMap = {
    pending: { label: "Pending", cls: "bg-stone-100 text-stone-700 border-stone-200", icon: Clock },
    accepted: { label: "Accepted", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-orange-600 mb-2">Your dashboard</div>
          <h1 className="text-4xl font-medium tracking-tight">Hi, {user.name}</h1>
        </div>
        <Link to="/analyzer">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="dashboard-analyzer-btn">
            <Sparkles className="w-4 h-4 mr-2" /> Analyze resume
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatBox label="Applications" value={apps.length} />
        <StatBox label="Pending" value={apps.filter(a => a.status === "pending").length} />
        <StatBox label="Accepted" value={apps.filter(a => a.status === "accepted").length} accent />
        <StatBox label="Rejected" value={apps.filter(a => a.status === "rejected").length} />
      </div>

      <h2 className="font-heading text-2xl font-medium mb-4">Your applications</h2>
      {loading ? (
        <div className="text-stone-500 text-sm">Loading...</div>
      ) : apps.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-xl p-10 text-center">
          <Briefcase className="w-8 h-8 text-stone-300 mx-auto mb-3" strokeWidth={1.5} />
          <div className="text-stone-600 mb-4">No applications yet</div>
          <Link to="/jobs"><Button className="bg-stone-900 hover:bg-stone-800 text-white" data-testid="browse-jobs-empty-btn">Browse jobs</Button></Link>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((a) => {
            const s = statusMap[a.status];
            return (
              <Link key={a.id} to={`/jobs/${a.job_id}`} className="hover-lift block bg-white border border-stone-200 rounded-xl p-4" data-testid={`app-${a.id}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-heading font-medium">{a.job?.title || "Job"}</div>
                    <div className="text-sm text-stone-500">{a.job?.company_name} · {a.job?.location}</div>
                  </div>
                  <div className={`text-xs px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${s.cls}`}>
                    <s.icon className="w-3 h-3" /> {s.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EmployerDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPost, setOpenPost] = useState(false);
  const [applicantsFor, setApplicantsFor] = useState(null);
  const [applicants, setApplicants] = useState([]);

  const load = async () => {
    setLoading(true);
    const r = await api.get("/my/jobs");
    setJobs(r.data);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) { nav("/login"); return; }
    if (user.role !== "employer") { nav("/dashboard/seeker"); return; }
    load();
  }, [user]);

  const viewApplicants = async (job) => {
    setApplicantsFor(job);
    const r = await api.get(`/jobs/${job.id}/applicants`);
    setApplicants(r.data);
  };

  const setStatus = async (appId, status) => {
    await api.patch(`/applications/${appId}/status`, { status });
    setApplicants((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
    toast.success(`Marked ${status}`);
  };

  const deleteJob = async (id) => {
    if (!window.confirm("Delete this job and all its applications?")) return;
    await api.delete(`/jobs/${id}`);
    toast.success("Deleted");
    load();
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-orange-600 mb-2">Employer dashboard</div>
          <h1 className="text-4xl font-medium tracking-tight">{user.company_name || user.name}</h1>
        </div>
        <Button onClick={() => setOpenPost(true)} className="bg-orange-600 hover:bg-orange-700 text-white" data-testid="post-job-btn">
          <Plus className="w-4 h-4 mr-2" /> Post a job
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatBox label="Open jobs" value={jobs.length} />
        <StatBox label="Applicants" value={jobs.reduce((s, j) => s + (j.applicants_count || 0), 0)} accent />
        <StatBox label="Avg per job" value={jobs.length ? Math.round(jobs.reduce((s, j) => s + (j.applicants_count || 0), 0) / jobs.length) : 0} />
        <StatBox label="Company" value={user.company_name || "—"} small />
      </div>

      <h2 className="font-heading text-2xl font-medium mb-4">Your jobs</h2>
      {loading ? (
        <div className="text-stone-500 text-sm">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-xl p-10 text-center">
          <Briefcase className="w-8 h-8 text-stone-300 mx-auto mb-3" strokeWidth={1.5} />
          <div className="text-stone-600 mb-4">You haven't posted a job yet</div>
          <Button onClick={() => setOpenPost(true)} className="bg-stone-900 hover:bg-stone-800 text-white" data-testid="post-first-job-btn">Post your first job</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.id} className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between gap-4" data-testid={`employer-job-${j.id}`}>
              <div className="min-w-0 flex-1">
                <div className="font-heading font-medium">{j.title}</div>
                <div className="text-sm text-stone-500">{j.location} · {j.job_type} · {j.experience}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => viewApplicants(j)} className="text-sm text-stone-700 hover:text-orange-600 inline-flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-stone-50" data-testid={`view-applicants-${j.id}`}>
                  <Users className="w-4 h-4" /> {j.applicants_count} applicants <ChevronRight className="w-3 h-3" />
                </button>
                <button onClick={() => deleteJob(j.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-md" data-testid={`delete-job-${j.id}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PostJobDialog open={openPost} onOpenChange={setOpenPost} onCreated={load} />

      <Dialog open={!!applicantsFor} onOpenChange={(o) => !o && setApplicantsFor(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Applicants for {applicantsFor?.title}</DialogTitle>
          </DialogHeader>
          {applicants.length === 0 ? (
            <div className="text-center py-8 text-stone-500">No applicants yet.</div>
          ) : (
            <div className="space-y-3">
              {applicants.map((a) => (
                <div key={a.id} className="border border-stone-200 rounded-xl p-4" data-testid={`applicant-${a.id}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-medium">{a.seeker_name}</div>
                      <div className="text-sm text-stone-500">{a.seeker_email}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${a.status === "accepted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : a.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" : "bg-stone-100 text-stone-700 border-stone-200"}`}>
                      {a.status}
                    </span>
                  </div>
                  {a.cover_note && (
                    <div className="text-sm text-stone-700 bg-stone-50 rounded-md p-3 mb-2">{a.cover_note}</div>
                  )}
                  {a.resume_text && (
                    <details className="text-xs text-stone-600">
                      <summary className="cursor-pointer text-orange-600 hover:underline">View resume</summary>
                      <pre className="mt-2 whitespace-pre-wrap font-mono bg-stone-50 rounded p-3 max-h-60 overflow-auto">{a.resume_text}</pre>
                    </details>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => setStatus(a.id, "accepted")} className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid={`accept-${a.id}`}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "rejected")} className="border-red-200 text-red-700 hover:bg-red-50" data-testid={`reject-${a.id}`}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PostJobDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "Engineering", location: "",
    job_type: "Full-time", experience: "Mid", salary_min: 80000, salary_max: 120000, skills: "",
  });
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        salary_min: Number(form.salary_min) || 0,
        salary_max: Number(form.salary_max) || 0,
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
      };
      await api.post("/jobs", payload);
      toast.success("Job posted!");
      onOpenChange(false);
      onCreated();
      setForm({ title: "", description: "", category: "Engineering", location: "", job_type: "Full-time", experience: "Mid", salary_min: 80000, salary_max: 120000, skills: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post a new job</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Job title</Label>
            <Input required value={form.title} onChange={upd("title")} data-testid="post-title" className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5" data-testid="post-category"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input required value={form.location} onChange={upd("location")} placeholder="Remote or City" data-testid="post-location" className="mt-1.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Job type</Label>
              <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                <SelectTrigger className="mt-1.5" data-testid="post-type"><SelectValue /></SelectTrigger>
                <SelectContent>{JOB_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Experience</Label>
              <Select value={form.experience} onValueChange={(v) => setForm({ ...form, experience: v })}>
                <SelectTrigger className="mt-1.5" data-testid="post-experience"><SelectValue /></SelectTrigger>
                <SelectContent>{EXPERIENCE.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Salary min ($)</Label>
              <Input type="number" value={form.salary_min} onChange={upd("salary_min")} data-testid="post-salary-min" className="mt-1.5" />
            </div>
            <div>
              <Label>Salary max ($)</Label>
              <Input type="number" value={form.salary_max} onChange={upd("salary_max")} data-testid="post-salary-max" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>Skills (comma-separated)</Label>
            <Input value={form.skills} onChange={upd("skills")} placeholder="React, TypeScript, Node.js" data-testid="post-skills" className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea required rows={6} value={form.description} onChange={upd("description")} data-testid="post-description" className="mt-1.5" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white" data-testid="post-submit-btn">
              {loading ? "Posting..." : "Post job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, accent, small }) {
  return (
    <div className={`p-4 rounded-xl border ${accent ? "bg-orange-50 border-orange-200" : "bg-white border-stone-200"}`}>
      <div className="text-xs font-mono uppercase tracking-widest text-stone-500">{label}</div>
      <div className={`font-heading font-medium text-stone-900 mt-1 ${small ? "text-lg" : "text-3xl"}`}>{value}</div>
    </div>
  );
}
