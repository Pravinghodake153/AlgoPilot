import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

/**
 * Dashboard layout — top navigation with logo, current page title, user controls.
 * No sidebar per UI/UX spec: "No sidebar. No unnecessary menu items."
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        {/* Left: Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-foreground"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="text-sm font-semibold tracking-tight">
            AlgoPilot
          </span>
        </Link>

        {/* Center: Empty for now — will show "Current Interview" during interviews */}

        {/* Right: User controls */}
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
