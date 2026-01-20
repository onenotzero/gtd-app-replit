import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Inbox from "@/pages/inbox";
import Projects from "@/pages/projects";
import NextActions from "@/pages/next-actions";
import WaitingFor from "@/pages/waiting-for";
import Calendar from "@/pages/calendar";
import Reference from "@/pages/reference";
import Incubate from "@/pages/incubate";
import Trash from "@/pages/trash";
import Done from "@/pages/done";
import WeeklyReview from "@/pages/weekly-review";
import SidebarNav from "@/components/sidebar-nav";

function Router() {
  const [location] = useLocation();
  const isInboxPage = location === "/inbox";

  return (
    <div className="flex h-screen bg-background">
      {/* Hide main sidebar on inbox page - inbox has its own list sidebar */}
      {!isInboxPage && <SidebarNav />}
      <main className={`flex-1 overflow-y-auto ${isInboxPage ? '' : 'p-4 md:p-6 lg:p-8 pt-16 lg:pt-8'}`}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/projects" component={Projects} />
          <Route path="/next-actions" component={NextActions} />
          <Route path="/waiting-for" component={WaitingFor} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/weekly-review" component={WeeklyReview} />
          <Route path="/done" component={Done} />
          <Route path="/reference" component={Reference} />
          <Route path="/incubate" component={Incubate} />
          <Route path="/trash" component={Trash} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
