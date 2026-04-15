import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import Index from "./pages/Index";
import ReportIssue from "./pages/ReportIssue";
import IssuesList from "./pages/IssuesList";
import IssueDetail from "./pages/IssueDetail";
import Notifications from "./pages/Notifications";
import NGODashboard from "./pages/NGODashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/report" element={<ReportIssue />} />
            <Route path="/issues" element={<IssuesList />} />
            <Route path="/issue/:id" element={<IssueDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/ngo" element={<NGODashboard />} />
            <Route path="/worker" element={<WorkerDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
