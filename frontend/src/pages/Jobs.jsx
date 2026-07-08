import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Search, MapPin, Briefcase, Filter } from "lucide-react";

const CATEGORIES = ["Engineering", "Design", "AI/ML", "Marketing", "Data", "Content"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Remote"];
const EXPERIENCE = ["Entry", "Mid", "Senior", "Lead"];

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({
    q: params.get("q") || "",
    location: params.get("location") || "",
    category: params.get("category") || "",
    job_type: params.get("job_type") || "",
    experience: params.get("experience") || "",
    salary_min: params.get("salary_min") || "",
  });
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchJobs = async () => {
    setLoading(true);
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== "any"));
    const r = await api.get("/jobs", { params: { ...clean, page, page_size: 12 } });
    setData(r.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, [page, fetchJobs]);

  const applyFilters = (e) => {
    e?.preventDefault();
    setPage(1);
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== "any"));
    setParams(clean);
    fetchJobs();
  };

  const clearAll = () => {
    setFilters({ q: "", location: "", category: "", job_type: "", experience: "", salary_min: "" });
    setParams({});
    setPage(1);
    setTimeout(fetchJobs, 0);
  };

  const totalPages = Math.max(1, Math.ceil(data.total / 12));

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <div className="text-xs font-mono uppercase tracking-widest text-orange-600 mb-2">All jobs</div>
        <h1 className="text-4xl font-medium tracking-tight">Find your next role</h1>
      </div>

      {/* Search bar */}
      <form onSubmit={applyFilters} className="mb-8 flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3">
          <Search className="w-4 h-4 text-stone-400" />
          <input
            data-testid="jobs-search-input"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="Title, skill, company..."
            className="flex-1 bg-transparent border-none outline-none py-2.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 w-64">
          <MapPin className="w-4 h-4 text-stone-400" />
          <input
            data-testid="jobs-location-input"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            placeholder="Location"
            className="flex-1 bg-transparent border-none outline-none py-2.5 text-sm"
          />
        </div>
        <Button type="submit" className="bg-stone-900 hover:bg-stone-800 text-white" data-testid="jobs-search-btn">Search</Button>
      </form>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        {/* Sidebar filters */}
        <aside className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4" /> Filters
            </div>
            <button onClick={clearAll} className="text-xs text-stone-500 hover:text-orange-600" data-testid="clear-filters-btn">Clear all</button>
          </div>

          <FilterBlock label="Category">
            <Select value={filters.category || "any"} onValueChange={(v) => setFilters({ ...filters, category: v === "any" ? "" : v })}>
              <SelectTrigger data-testid="filter-category-trigger"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterBlock>

          <FilterBlock label="Job type">
            <Select value={filters.job_type || "any"} onValueChange={(v) => setFilters({ ...filters, job_type: v === "any" ? "" : v })}>
              <SelectTrigger data-testid="filter-job-type-trigger"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {JOB_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterBlock>

          <FilterBlock label="Experience">
            <Select value={filters.experience || "any"} onValueChange={(v) => setFilters({ ...filters, experience: v === "any" ? "" : v })}>
              <SelectTrigger data-testid="filter-experience-trigger"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {EXPERIENCE.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterBlock>

          <FilterBlock label="Min salary (USD)">
            <Input
              type="number"
              value={filters.salary_min}
              onChange={(e) => setFilters({ ...filters, salary_min: e.target.value })}
              placeholder="e.g. 100000"
              data-testid="filter-salary-input"
            />
          </FilterBlock>

          <Button onClick={applyFilters} className="w-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="apply-filters-btn">Apply filters</Button>
        </aside>

        {/* Results */}
        <div>
          <div className="text-sm text-stone-500 mb-4 font-mono">
            {loading ? "Searching..." : `${data.total} jobs found`}
          </div>

          <div className="space-y-3">
            {data.items.map((job) => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="hover-lift block bg-white border border-stone-200 rounded-xl p-5" data-testid={`job-card-${job.id}`}>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-stone-900 text-white flex items-center justify-center font-medium shrink-0">
                    {job.company_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-heading text-lg font-medium text-stone-900">{job.title}</h3>
                        <div className="text-sm text-stone-600">{job.company_name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-orange-600 font-mono text-sm font-medium">
                          ${(job.salary_min/1000).toFixed(0)}k–${(job.salary_max/1000).toFixed(0)}k
                        </div>
                        <div className="text-xs text-stone-400 mt-1">{job.applicants_count} applicants</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="text-xs bg-stone-100 border border-stone-200 text-stone-700 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{job.location}
                      </span>
                      <span className="text-xs bg-stone-100 border border-stone-200 text-stone-700 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />{job.job_type}
                      </span>
                      <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-2 py-0.5">{job.experience}</span>
                      {job.skills?.slice(0, 3).map((s) => (
                        <span key={s} className="text-xs text-stone-500 rounded-full px-2 py-0.5">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {!loading && data.items.length === 0 && (
              <div className="text-center py-16 text-stone-500" data-testid="no-jobs-found">
                No jobs match your filters. Try clearing them.
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} data-testid="page-prev">Previous</Button>
              <span className="text-sm text-stone-500 font-mono px-3">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)} data-testid="page-next">Next</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterBlock({ label, children }) {
  return (
    <div>
      <div className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-2">{label}</div>
      {children}
    </div>
  );
}
