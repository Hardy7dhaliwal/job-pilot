"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProviderToggle } from "@/components/provider-toggle";
import {
  BarChart3,
  Briefcase,
  FileText,
  Kanban,
  LayoutDashboard,
  LogOut,
  Moon,
  Rocket,
  Search,
  ShieldCheck,
  Sun,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/resumes", label: "Resumes", icon: FileText },
      { href: "/jobs", label: "Jobs", icon: Briefcase },
    ],
  },
  {
    label: "Search",
    items: [
      { href: "/discover", label: "Discover", icon: Search },
      { href: "/tracker", label: "Tracker", icon: Kanban },
      { href: "/tracker/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/review", label: "Review Queue", icon: ShieldCheck },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Shared list renderer so the desktop sidebar and mobile drawer stay in sync. */
export function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 px-2 py-2">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  "before:absolute before:left-0 before:top-1/2 before:h-5 before:-translate-y-1/2 before:rounded-full before:bg-transparent before:transition-all",
                  active
                    ? "bg-primary/10 font-medium text-primary before:w-1 before:bg-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground before:w-0 group-hover:before:w-0.5 group-hover:before:bg-border"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** JobPilot logo lockup — gradient mark + wordmark, used in sidebar + mobile header. */
export function BrandMark({ size = "sm" }: { size?: "sm" | "md" }) {
  const box = size === "md" ? "h-8 w-8" : "h-7 w-7";
  const icon = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const text = size === "md" ? "text-base" : "text-sm";
  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm", box)}>
        <Rocket className={icon} />
      </div>
      <span className={cn("font-semibold tracking-tight", text)}>JobPilot</span>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center px-4 py-5">
        <BrandMark size="md" />
      </div>

      <NavList pathname={pathname} />

      <div className="border-t border-sidebar-border p-2 space-y-1">
        <ProviderToggle />
        {mounted && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 px-3 font-normal text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4" />
                Light mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                Dark mode
              </>
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 px-3 font-normal text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
