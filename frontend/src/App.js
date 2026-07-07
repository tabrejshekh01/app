import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import { Login, Register } from "./pages/Auth";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Analyzer from "./pages/Analyzer";
import { SeekerDashboard, EmployerDashboard } from "./pages/Dashboards";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/analyzer" element={<Analyzer />} />
              <Route path="/dashboard/seeker" element={<SeekerDashboard />} />
              <Route path="/dashboard/employer" element={<EmployerDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

function NotFound() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <div className="font-mono text-xs text-stone-500 uppercase tracking-widest">404</div>
      <h1 className="font-heading text-4xl font-medium mt-2 mb-2">Page not found</h1>
      <a href="/" className="text-orange-600 hover:underline">Back home</a>
    </div>
  );
}

export default App;
