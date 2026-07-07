import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Briefcase, User } from "lucide-react";

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      nav(u.role === "employer" ? "/dashboard/employer" : "/dashboard/seeker");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    setEmail(role === "employer" ? "employer@demo.com" : "seeker@demo.com");
    setPassword("demo1234");
  };

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="text-3xl font-medium tracking-tight mb-2">Welcome back</h1>
      <p className="text-stone-600 mb-8">Sign in to continue your job hunt.</p>

      <div className="flex gap-2 mb-6">
        <button type="button" onClick={() => fillDemo("seeker")} className="flex-1 text-xs px-3 py-2 rounded-md border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-mono" data-testid="demo-seeker-btn">Demo Seeker</button>
        <button type="button" onClick={() => fillDemo("employer")} className="flex-1 text-xs px-3 py-2 rounded-md border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-mono" data-testid="demo-employer-btn">Demo Employer</button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email-input" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" className="mt-1.5" />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-stone-900 hover:bg-stone-800 text-white" data-testid="login-submit-btn">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="text-sm text-stone-600 text-center mt-6">
        New here? <Link to="/register" className="text-orange-600 hover:underline underline-offset-4" data-testid="goto-register-link">Create an account</Link>
      </p>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", company_name: "" });
  const [role, setRole] = useState("seeker");
  const [loading, setLoading] = useState(false);

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, role };
      if (role !== "employer") delete payload.company_name;
      const u = await register(payload);
      toast.success(`Welcome, ${u.name}!`);
      nav(u.role === "employer" ? "/dashboard/employer" : "/dashboard/seeker");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-3xl font-medium tracking-tight mb-2">Create your account</h1>
      <p className="text-stone-600 mb-8">Join thousands finding better jobs, faster.</p>

      <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-stone-100 rounded-lg">
        <button type="button" onClick={() => setRole("seeker")} data-testid="role-seeker-btn"
          className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${role === "seeker" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}>
          <User className="w-4 h-4" /> Job Seeker
        </button>
        <button type="button" onClick={() => setRole("employer")} data-testid="role-employer-btn"
          className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${role === "employer" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}>
          <Briefcase className="w-4 h-4" /> Employer
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={form.name} onChange={upd("name")} data-testid="register-name-input" className="mt-1.5" />
        </div>
        {role === "employer" && (
          <div>
            <Label htmlFor="company">Company name</Label>
            <Input id="company" required value={form.company_name} onChange={upd("company_name")} data-testid="register-company-input" className="mt-1.5" />
          </div>
        )}
        <div>
          <Label htmlFor="email2">Email</Label>
          <Input id="email2" type="email" required value={form.email} onChange={upd("email")} data-testid="register-email-input" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="password2">Password</Label>
          <Input id="password2" type="password" required minLength={6} value={form.password} onChange={upd("password")} data-testid="register-password-input" className="mt-1.5" />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-stone-900 hover:bg-stone-800 text-white" data-testid="register-submit-btn">
          {loading ? "Creating..." : "Create account"}
        </Button>
      </form>

      <p className="text-sm text-stone-600 text-center mt-6">
        Already have an account? <Link to="/login" className="text-orange-600 hover:underline underline-offset-4" data-testid="goto-login-link">Sign in</Link>
      </p>
    </div>
  );
}
