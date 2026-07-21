import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Database, Users, MessageSquare } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: "Settings & Users", href: "/admin", icon: Settings },
    { name: "Database Logs", href: "/admin/database", icon: Database },
  ];

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-foreground hover:opacity-80">
          AlgoPilot<span className="text-primary">.Admin</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {link.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
