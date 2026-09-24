import Link from 'next/link';
import { LayoutDashboard, Settings, Users, Vault } from 'lucide-react';

import { LogoutButton } from '@/components/logout-button';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Area = 'dashboard' | 'recipients' | 'manage' | 'settings';

const navItems: Array<{
  area: Area;
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    area: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  { area: 'recipients', href: '/', label: 'Recipients', icon: Users },
  { area: 'manage', href: '/recipients/manage', label: 'Manage', icon: Users },
  { area: 'settings', href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({
  active,
  children,
}: {
  active: Area;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/25">
      <header className="border-b border-border/80 bg-background">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Vault className="size-4.5" aria-hidden="true" />
            </span>
            <span className="font-mono text-sm font-semibold tracking-[0.18em] text-foreground">
              LIVE.VAULT
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Primary navigation"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.area === active;
              return (
                <Link
                  key={item.area}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    isActive && 'bg-muted text-foreground',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs font-medium text-muted-foreground lg:inline">
              Admin workspace
            </span>
            <span className="flex size-8 items-center justify-center rounded-full border border-border bg-muted font-mono text-[11px] font-semibold text-foreground">
              AD
            </span>
            <LogoutButton />
          </div>
        </div>

        <nav
          className="border-t border-border/60 md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto grid w-full grid-cols-4 gap-1 px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.area === active;
              return (
                <Link
                  key={item.area}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'h-9 min-w-0 gap-1 px-1 text-[11px]',
                    isActive && 'bg-muted text-foreground',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {children}
    </div>
  );
}
