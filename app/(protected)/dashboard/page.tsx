import Link from 'next/link';
import {
  ArrowRight,
  CalendarRange,
  Clock3,
  Database,
  Send,
  Upload,
  Users,
} from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { listRecipients } from '@/server/recipients';

const todayMetrics = [
  { label: 'Reports', value: '—', icon: Upload },
  { label: 'Sent', value: '—', icon: Send },
  { label: 'Pending', value: '—', icon: Clock3 },
];

export default async function DashboardPage() {
  const activeRecipients = await listRecipients({ activeOnly: true });

  return (
    <AppShell active="dashboard">
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <PageHeader
          title="Operations overview"
          description="Track today's report flow, the active list cycle, and retained storage."
        />

        <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <Card className="border-border/90 bg-card py-0">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-sm font-semibold">Today</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Available after report backend integration
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-border bg-muted/40 text-muted-foreground"
                >
                  Placeholder
                </Badge>
              </div>
              <div className="grid divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {todayMetrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div key={metric.label} className="px-5 py-6 sm:px-6">
                      <Icon
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      <p className="mt-5 font-mono text-3xl font-semibold tracking-tight">
                        {metric.value}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {metric.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/[0.055] py-0">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <CalendarRange
                  className="size-5 text-primary"
                  aria-hidden="true"
                />
                <Badge className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/10">
                  Placeholder
                </Badge>
              </div>
              <p className="mt-8 text-xs text-muted-foreground">Report cycle</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                Not connected
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-primary/15 pt-4 text-xs">
                <span className="text-muted-foreground">Total reports</span>
                <span className="font-mono font-semibold">—</span>
              </div>
              <Link
                href="/settings"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'mt-5 w-full',
                )}
              >
                Manage report cycle
              </Link>
            </CardContent>
          </Card>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="border-border/90 bg-card py-0">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Database className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">Data storage</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Retention status will appear after the report backend is
                    connected.
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border/70 pt-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Retention
                      </dt>
                      <dd className="mt-1 font-mono text-sm font-semibold">
                        Planned
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Oldest available
                      </dt>
                      <dd className="mt-1 font-mono text-sm font-semibold">
                        —
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/90 bg-card py-0">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Users className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">Recipient queue</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {activeRecipients.length} active recipients are ready for
                    report selection.
                  </p>
                  <Link
                    href="/"
                    className={cn(
                      buttonVariants({ variant: 'link', size: 'sm' }),
                      'mt-3 px-0',
                    )}
                  >
                    Select recipient
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10 border-t border-border/80 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Continue reporting</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose an active recipient before starting an upload.
              </p>
            </div>
            <Link href="/" className={buttonVariants()}>
              <Upload className="size-4" aria-hidden="true" />
              Choose recipient
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
