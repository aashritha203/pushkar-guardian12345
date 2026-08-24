import { createFileRoute } from "@tanstack/react-router";

// Redirect root to login if not authenticated, otherwise dashboard
export const Route = createFileRoute("/")({
  component: () => {
    if (typeof window !== "undefined") {
      const isLoggedIn = localStorage.getItem("loggedIn") === "true";
      if (isLoggedIn) {
        window.location.replace("/dashboard");
      } else {
        window.location.replace("/login");
      }
    }
    return null;
  },
});
