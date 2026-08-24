import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { Header } from "@/components/dashboard/Header";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: () => (
    <div className="min-h-screen">
      <Header role="user" />
      <DashboardView role="user" />
    </div>
  ),
});
