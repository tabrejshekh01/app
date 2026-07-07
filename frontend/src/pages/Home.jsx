import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Search, Sparkles, ArrowRight, MapPin, Briefcase, Building2, Zap, TrendingUp, Users } from "lucide-react";

const TESTIMONIALS = [
  { name: "Sarah Jenkins", role: "Product Manager at TechFlow", img: "https://images.pexels.com/photos/31869537/pexels-photo-31869537.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", quote: "The AI analyzer told me exactly what was missing from my resume. Landed 3 interviews in a week." },
  { name: "David Chen", role: "Senior Engineer", img: "https://images.pexels.com/photos/26872232/pexels-photo-26872232.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", quote: "Every listing feels curated. I stopped scrolling and started applying." },
  { name: "Marcus Johnson", role: "UX Designer", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MzQxOTk1NXww&ixlib=rb-4.1.0&q=85", quote: "Match scores changed how I job hunt. I only apply to 90%+ matches now." },
];

export default function Home() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    api.get("/jobs/featured").then((r) => setFeatured(r.data));
    api.get("/jobs/categories").then((r) => setCategories(r.data));
    api.get("/jobs/companies").then((r) => setCompanies(r.data));
    api.get("/jobs/stats").then((r) => setStats(r.data));
  }, []);

  const doSearch = (e) => {
    e?.preventDefault();
    nav(`/jobs${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 dot-grid-bg opacity-70" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-mono uppercase tracking-widest mb-6 animate-fade-up">
            <Sparkles className="w-3 h-3" /> AI-powered job matching
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tighter text-stone-900 mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            Find the job that <span className="italic text-orange-600">actually</span> fits you.
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Skip the endless scroll. Paste your resume, get an instant AI score, and see the top jobs matched to your skills — in seconds.
          </p>

          <form onSubmit={doSearch} className="max-w-2xl mx-auto glass rounded-2xl border border-stone-200 p-2 flex items-center gap-2 shadow-lg animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <div className="flex-1 flex items-center gap-2 px-3">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                data-testid="hero-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search job title, skill, or company"
                className="flex-1 bg-transparent border-none outline-none py-3 text-base placeholder:text-stone-400"
              />
            </div>
            <Button type="submit" data-testid="hero-search-btn" className="bg-stone-900 hover:bg-stone-800 text-white rounded-xl px-6 h-11">
              Search <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <Link to="/analyzer" className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium underline-offset-4 hover:underline" data-testid="hero-analyzer-link">
              <Sparkles className="w-4 h-4" /> Try the AI Resume Analyzer
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto animate-fade-up" style={{ animationDelay: "0.5s" }}>
            {[
              { icon: Briefcase, label: "Open jobs", val: stats.total_jobs ?? "—" },
              { icon: Users, label: "Candidates", val: stats.total_seekers ?? "—" },
              { icon: Building2, label: "Companies", val: stats.total_employers ?? "—" },
              { icon: TrendingUp, label: "Applications", val: stats.total_applications ?? "—" },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl bg-white border border-stone-200" data-testid={`stat-${s.label.toLowerCase().replace(/ /g, '-')}`}>
                <s.icon className="w-4 h-4 text-orange-600 mb-2 mx-auto" strokeWidth={1.5} />
                <div className="font-heading text-2xl font-medium text-stone-900">{s.val}</div>
                <div className="text-xs text-stone-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED JOBS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-orange-600 mb-2">Featured</div>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight">Fresh roles this week</h2>
          </div>
          <Link to="/jobs" className="text-sm text-stone-700 hover:text-orange-600 underline-offset-4 hover:underline inline-flex items-center gap-1" data-testid="view-all-jobs-link">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((job) => (
            <Link key={job.id} to={`/jobs/${job.id}`} className="hover-lift bg-white border border-stone-200 rounded-xl p-5 block" data-testid={`featured-job-${job.id}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-md bg-stone-100 flex items-center justify-center text-xs font-medium text-stone-700">
                  {job.company_name?.[0]}
                </div>
                <span className="text-sm text-stone-600">{job.company_name}</span>
              </div>
              <h3 className="font-heading text-lg font-medium text-stone-900 mb-2 leading-snug">{job.title}</h3>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {job.skills?.slice(0, 3).map((s) => (
                  <span key={s} className="text-xs bg-stone-50 border border-stone-200 text-stone-600 rounded-full px-2 py-0.5">{s}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                <span className="text-orange-600 font-mono">${(job.salary_min/1000).toFixed(0)}k–${(job.salary_max/1000).toFixed(0)}k</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CATEGORIES + AI CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="text-xs font-mono uppercase tracking-widest text-orange-600 mb-2">Explore</div>
          <h2 className="text-3xl font-medium tracking-tight mb-6">Browse by category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((c) => (
              <Link key={c.category} to={`/jobs?category=${encodeURIComponent(c.category)}`} className="hover-lift bg-white border border-stone-200 rounded-xl p-4" data-testid={`category-${c.category.toLowerCase()}`}>
                <div className="font-heading font-medium text-stone-900">{c.category}</div>
                <div className="text-xs text-stone-500 mt-1 font-mono">{c.count} open</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="relative rounded-2xl p-6 overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
          <Zap className="w-6 h-6 mb-3" strokeWidth={1.5} />
          <h3 className="font-heading text-2xl font-medium mb-2 leading-tight">Your resume, scored by AI.</h3>
          <p className="text-emerald-100 text-sm mb-6">Get an instant 0–100 quality score, strengths, gaps, and top 6 matched jobs. Powered by Claude Sonnet 4.5.</p>
          <Link to="/analyzer" className="inline-flex items-center gap-2 bg-white text-emerald-800 px-4 py-2 rounded-md font-medium text-sm hover:bg-emerald-50 transition-colors" data-testid="cta-analyzer-btn">
            Analyze now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* TOP COMPANIES */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-xs font-mono uppercase tracking-widest text-orange-600 mb-2">Hiring now</div>
        <h2 className="text-3xl font-medium tracking-tight mb-8">Top companies</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {companies.map((c) => (
            <Link key={c.company_name} to={`/jobs?q=${encodeURIComponent(c.company_name)}`} className="hover-lift bg-white border border-stone-200 rounded-xl p-5 text-center" data-testid={`company-${c.company_name.toLowerCase().replace(/ /g, '-')}`}>
              <div className="w-12 h-12 rounded-lg bg-stone-900 text-white text-lg font-medium flex items-center justify-center mx-auto mb-3">
                {c.company_name[0]}
              </div>
              <div className="font-heading font-medium text-stone-900 text-sm">{c.company_name}</div>
              <div className="text-xs text-stone-500 mt-1 font-mono">{c.open_jobs} open roles</div>
            </Link>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-xs font-mono uppercase tracking-widest text-orange-600 mb-2">Loved by</div>
        <h2 className="text-3xl font-medium tracking-tight mb-8">People who found their fit</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white border border-stone-200 rounded-xl p-6" data-testid={`testimonial-${t.name.toLowerCase().replace(/ /g, '-')}`}>
              <p className="text-stone-700 leading-relaxed mb-6 italic">"{t.quote}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-stone-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
