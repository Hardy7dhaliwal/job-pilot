"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogOut, Menu, X } from "lucide-react";
import { BrandMark, NavList } from "./app-sidebar";

/**
 * Mobile top-bar with a hamburger button that opens a full-height nav drawer.
 * Only rendered on screens below the md breakpoint (the sidebar handles md+).
 */
export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-3 md:hidden">
      <BrandMark size="sm" />

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Visually hidden title for accessibility. */}
        <DialogTitle className="sr-only">Navigation menu</DialogTitle>
        <DialogContent
          className="fixed inset-y-0 left-0 m-0 h-full w-72 max-w-full translate-x-0 rounded-none border-r border-sidebar-border bg-sidebar p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
            <BrandMark size="sm" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <NavList pathname={pathname} onNavigate={() => setOpen(false)} />

          {/* Sign out */}
          <div className="border-t border-sidebar-border p-2">
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
        </DialogContent>
      </Dialog>
    </header>
  );
}
