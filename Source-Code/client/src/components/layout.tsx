import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  BookOpen,
  Users,
  Settings,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Übersicht", icon: LayoutDashboard },
  { href: "/belege", label: "Belege", icon: Receipt },
  { href: "/rechnungen", label: "Rechnungen", icon: FileText },
  { href: "/buchungen", label: "Buchungen", icon: BookOpen },
  { href: "/kunden", label: "Kunden", icon: Users },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
];

function LogoIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BuchungsApp Logo"
    >
      <rect x="2" y="3" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="8" y="3" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="2" fill="hsl(var(--background))" />
      <line x1="12" y1="9" x2="22" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="13" x2="22" y2="13" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="17" x2="19" y2="17" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="21" x2="17" y2="21" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <div className="flex items-center gap-2.5 px-2">
          <div className="text-primary">
            <LogoIcon />
          </div>
          <span className="font-semibold text-base tracking-tight">BuchungsApp</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-0.5" data-testid="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? location === "/" || location === ""
              : location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              data-testid={`nav-${item.href.replace("/", "") || "dashboard"}`}
            >
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 pb-2">
        <PerplexityAttribution />
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r bg-sidebar shrink-0">
        <SidebarNav />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 border-b bg-background">
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="mobile-menu-toggle">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <div className="flex items-center gap-2 ml-2">
            <div className="text-primary">
              <LogoIcon />
            </div>
            <span className="font-semibold text-sm">BuchungsApp</span>
          </div>
        </div>
        <SheetContent side="left" className="w-56 p-0">
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-14">
        <div className="p-4 md:p-6 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}
