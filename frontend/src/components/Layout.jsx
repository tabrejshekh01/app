import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "./ui/button";
import { Sparkles, Briefcase, LogOut, User, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const dashboardPath = user?.role === "employer" ? "/dashboard/employer" : "/dashboard/seeker";

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900 flex flex-col">
      <header className="glass sticky top-0 z-50 border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group" data-testid="header-logo">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              <Briefcase className="w-4 h-4" strokeWidth={2} />
            </div>
            <span className="font-heading text-xl font-medium tracking-tight">JobHub<span className="text-orange-600">.ai</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link to="/jobs" className="px-3 py-2 rounded-md hover:bg-stone-100 text-stone-700" data-testid="nav-jobs">Browse Jobs</Link>
            <Link to="/analyzer" className="px-3 py-2 rounded-md hover:bg-emerald-50 text-emerald-700 font-medium inline-flex items-center gap-1.5" data-testid="nav-analyzer">
              <Sparkles className="w-3.5 h-3.5" /> AI Analyzer
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="user-menu-trigger" className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-orange-600 text-white text-xs font-medium flex items-center justify-center">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs text-stone-500 font-normal">
                    Signed in as <span className="font-medium text-stone-900">{user.email}</span>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-orange-600 font-mono">{user.role}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => nav(dashboardPath)} data-testid="menu-dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => nav("/analyzer")} data-testid="menu-analyzer">
                    <Sparkles className="w-4 h-4 mr-2" /> AI Analyzer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { logout(); nav("/"); }} data-testid="menu-logout">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" onClick={() => nav("/login")} data-testid="header-login-btn" className="text-stone-700">Login</Button>
                <Button onClick={() => nav("/register")} data-testid="header-register-btn" className="bg-stone-900 hover:bg-stone-800 text-white rounded-md">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-stone-200 bg-white mt-24">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="font-heading text-xl font-medium">JobHub<span className="text-orange-600">.ai</span></span>
            </div>
            <p className="text-sm text-stone-600 max-w-md">
              The modern job portal where AI matches you to the right role. Built for seekers who want more than a listing feed.
            </p>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-3">Product</div>
            <ul className="space-y-2 text-sm text-stone-700">
              <li><Link to="/jobs" className="hover:text-orange-600">Browse Jobs</Link></li>
              <li><Link to="/analyzer" className="hover:text-orange-600">AI Analyzer</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-3">Account</div>
            <ul className="space-y-2 text-sm text-stone-700">
              <li><Link to="/login" className="hover:text-orange-600">Login</Link></li>
              <li><Link to="/register" className="hover:text-orange-600">Register</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
          © 2026 JobHub.ai — Built with Emergent
        </div>
      </footer>
    </div>
  );
}
