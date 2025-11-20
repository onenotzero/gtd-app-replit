import { Switch, Route } from "wouter";
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
import SidebarNav from "@/components/sidebar-nav";

function Router() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <main className="flex-1 overflow-y-auto p-8">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/projects" component={Projects} />
          <Route path="/next-actions" component={NextActions} />
          <Route path="/waiting-for" component={WaitingFor} />
          <Route path="/calendar" component={Calendar} />
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
