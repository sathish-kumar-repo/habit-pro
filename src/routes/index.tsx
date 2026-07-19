/**
 * @file index.tsx
 * @description Root route — Habito's single-page entry point.
 *
 * Responsibilities of this thin file:
 *   1. Declare the TanStack Start route with rich SEO meta tags.
 *   2. Instantiate the shared data hook (useAppData).
 *   3. Compose the responsive layout shells (DesktopApp / MobileApp).
 *   4. Mount the shared modal drawers that span both layouts.
 *
 * All feature logic lives in dedicated modules under src/components/ and
 * src/hooks/ — this file stays intentionally small.
 *
 * @author Sathish Kumar
 */

import { createFileRoute } from "@tanstack/react-router";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { DesktopApp } from "@/components/layout/DesktopApp";
import { MobileApp } from "@/components/layout/MobileApp";
import { AddHabitDialog } from "@/components/habits/AddHabitDialog";
import { HabitDetailDialog } from "@/components/habits/HabitDetailDialog";
import { EditHabitDialog } from "@/components/habits/EditHabitDialog";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import type { User } from "firebase/auth";

/* ─── Route definition ──────────────────────────────────────────────────────
   Meta tags are pre-rendered by TanStack Start's <head()> API, giving the
   page proper SEO and social-sharing coverage without a separate SSR layer.
   ────────────────────────────────────────────────────────────────────────── */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Habito — Daily Habit Tracker" },
      { name: "description",        content: "Track your daily habits, measure streaks, and build consistency with Habito — a beautiful, privacy-first habit tracker." },
      { name: "author",             content: "Sathish Kumar" },
      { name: "robots",             content: "index, follow" },
      { name: "viewport",           content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color",        content: "#0d1117" },
      { name: "apple-mobile-web-app-capable",          content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title",            content: "Habito" },
      /* Open Graph */
      { property: "og:type",        content: "website" },
      { property: "og:title",       content: "Habito — Daily Habit Tracker" },
      { property: "og:description", content: "Build lasting habits with Habito. Track streaks, measure progress, and stay consistent every day." },
      { property: "og:image",       content: "/logo.png" },
      { property: "og:image:width",  content: "1200" },
      { property: "og:image:height", content: "630" },
      /* Twitter / X Card */
      { name: "twitter:card",        content: "summary_large_image" },
      { name: "twitter:title",       content: "Habito — Daily Habit Tracker" },
      { name: "twitter:description", content: "Build lasting habits with Habito. Track streaks, measure progress, and stay consistent every day." },
      { name: "twitter:image",       content: "/logo.png" },
    ],
    links: [
      { rel: "icon",             href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest",         href: "/site.webmanifest" },
    ],
  }),
  component: Index,
});

/* ─── Root component ─────────────────────────────────────────────────────── */
function Index() {
  const { user, loading } = useAuth();

  // While Firebase resolves the initial session, show a loading screen
  if (loading) return <AuthLoadingScreen />;

  // Unauthenticated — show the sign-in screen
  if (!user) return <AuthScreen />;

  // Authenticated — render the full app (user is narrowed to User here)
  return <AuthenticatedApp user={user} />;
}

function AuthenticatedApp({ user }: { user: User }) {
  const data = useAppData(user.uid);
  const { signOut } = useAuth();

  return (
    <>
      {/* Responsive layout shells — each hides itself at the wrong breakpoint */}
      <DesktopApp {...data} user={user} onSignOut={signOut} />
      <MobileApp  {...data} user={user} onSignOut={signOut} />

      {/* Shared drawers — mounted once, used by both layouts */}
      <AddHabitDialog open={data.addOpen} onOpenChange={data.setAddOpen} />
      <HabitDetailDialog
        habit={data.openHabit}
        onClose={() => data.setOpenId(null)}
        onToggleDay={data.toggleDay}
      />
      <EditHabitDialog habit={data.editHabit} onClose={() => data.setEditId(null)} />
    </>
  );
}
