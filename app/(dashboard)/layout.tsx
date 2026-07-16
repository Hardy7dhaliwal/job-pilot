import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { BulkAnalyzeFloating } from "@/components/jobs/bulk-analyze-floating";

/**
 * Dashboard shell: fixed sidebar + scrollable content area.
 * On small screens the sidebar is hidden and a MobileHeader with a
 * hamburger drawer is shown instead.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      {/* Desktop sidebar — hidden below md */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* Mobile top-bar — hidden at md and above */}
      <MobileHeader />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-4 md:p-8">{children}</div>
      </main>

      {/* Background job scoring widget (persists across navigations) */}
      <BulkAnalyzeFloating />
    </div>
  );
}
