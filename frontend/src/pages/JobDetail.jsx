import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Briefcase, DollarSign, ArrowLeft, Sparkles, Users } from "lucide-react";

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/jobs/${id}`)
      .then((r) => setJob(r.data))
      .catch(() => toast.error("Job not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/jobs/${id}/apply`, { cover_note: coverNote, resume_text: resumeText });
      toast.success("Application sent!");
      setOpen(false);
      nav("/dashboard/seeker");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to apply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyClick = () => {
    if (!user) { nav("/login"); return; }
    if (user.role !== "seeker") { toast.error("Sign in as a job seeker to apply"); return; }
    setOpen(true);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-20 text-center text-stone-500">Loading...</div>;
  if (!job) return <div className="max-w-4xl mx-auto px-6 py-20 text-center">Job not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-orange-600 mb-6" data-testid="back-to-jobs">
        <ArrowLeft className="w-4 h-4" /> Back to jobs
      </Link>

      <div className="bg-white border border-stone-200 rounded-2xl p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-stone-900 text-white flex items-center justify-center text-xl font-medium">
            {job.company_name[0]}
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-3xl font-medium text-stone-900 mb-1" data-testid="job-title">{job.title}</h1>
            <div className="text-stone-600">{job.company_name}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <MetaCard icon={MapPin} label="Location" value={job.location} />
          <MetaCard icon={Briefcase} label="Type" value={job.job_type} />
          <MetaCard icon={DollarSign} label="Salary" value={`$${(job.salary_min/1000).toFixed(0)}k–${(job.salary_max/1000).toFixed(0)}k`} />
          <MetaCard icon={Users} label="Applicants" value={job.applicants_count} />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-6">
          <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-2.5 py-1">{job.experience}</span>
          {job.skills?.map((s) => (
            <span key={s} className="text-xs bg-stone-100 border border-stone-200 text-stone-700 rounded-full px-2.5 py-1" data-testid={`skill-${s}`}>{s}</span>
          ))}
        </div>

        <div className="prose prose-stone max-w-none mb-8">
          <h3 className="font-heading text-lg font-medium mb-3">About this role</h3>
          <p className="text-stone-700 leading-relaxed whitespace-pre-line">{job.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-stone-100">
          <Button onClick={handleApplyClick} className="bg-orange-600 hover:bg-orange-700 text-white" data-testid="apply-job-button">
            Apply now
          </Button>
          <Link to={`/analyzer?target=${job.id}`}>
            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" data-testid="check-fit-btn">
              <Sparkles className="w-4 h-4 mr-2" /> Check my fit
            </Button>
          </Link>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply to {job.title}</DialogTitle>
            <DialogDescription>Send your resume and a short note to {job.company_name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-1.5 block">Cover note (optional)</label>
              <Textarea rows={3} value={coverNote} onChange={(e) => setCoverNote(e.target.value)} placeholder="Why are you a great fit?" data-testid="cover-note-input" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-1.5 block">Resume (paste text)</label>
              <Textarea rows={8} value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste your resume text here..." data-testid="resume-text-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="cancel-apply-btn">Cancel</Button>
            <Button onClick={submit} disabled={submitting} className="bg-orange-600 hover:bg-orange-700 text-white" data-testid="submit-apply-btn">
              {submitting ? "Sending..." : "Send application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetaCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
      <Icon className="w-3.5 h-3.5 text-stone-400 mb-1.5" />
      <div className="text-xs text-stone-500">{label}</div>
      <div className="font-medium text-sm text-stone-900 truncate">{value}</div>
    </div>
  );
}
