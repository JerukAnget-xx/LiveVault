import Link from 'next/link';
import { ArrowUpRight, Clock3, History, Upload, Vault } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { recipientInitials, type RecipientView } from '@/lib/recipient-display';
import { cn } from '@/lib/utils';

export function RecipientSelection({
  recipients,
  cycle,
}: {
  recipients: Array<RecipientView & { activeReportCount: number }>;
  cycle: { number: number; startedAt: string };
}) {
  return (
    <main
      id="main-content"
      className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16"
    >
      <section className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="max-w-2xl">
          <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Report routing
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
            Select a recipient
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Choose an active recipient to upload a report or open their
            text-only history.
          </p>
        </div>

        <aside
          className="rounded-xl border border-primary/20 bg-primary/[0.055] p-5"
          aria-label="Active report cycle"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Report cycle
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                Cycle #{cycle.number}
              </p>
            </div>
            <Badge className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/10">
              Active
            </Badge>
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-primary/15 pt-4 text-xs text-muted-foreground">
            <Clock3 className="size-3.5 text-primary" aria-hidden="true" />
            Started{' '}
            {new Intl.DateTimeFormat('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              timeZone: 'Asia/Jakarta',
            }).format(new Date(cycle.startedAt))}
          </div>
        </aside>
      </section>

      <section
        className="mt-12 sm:mt-14"
        aria-labelledby="recipient-list-heading"
      >
        <div className="mb-5 flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="recipient-list-heading"
              className="text-base font-semibold text-foreground"
            >
              Active recipients
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {recipients.length} available for the current cycle
            </p>
          </div>
          <Link
            href="/recipients/manage"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'w-fit',
            )}
          >
            Manage recipients
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        {recipients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {recipients.map((recipient) => (
              <Card
                key={recipient.id}
                className="group border-border/90 bg-card py-0 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/95"
              >
                <CardHeader className="flex flex-row items-start gap-4 border-b border-border/70 px-5 py-5 sm:px-6">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-xs font-semibold tracking-wide text-primary">
                    {recipientInitials(recipient.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="truncate text-base font-semibold tracking-tight text-foreground">
                        {recipient.name}
                      </CardTitle>
                      <span
                        className="size-1.5 rounded-full bg-primary"
                        aria-label="Active"
                      />
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {recipient.reportTitle}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="px-5 py-5 sm:px-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-2xl font-semibold tracking-tight text-foreground">
                        {recipient.activeReportCount}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reports in active list
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-border bg-muted/40 text-muted-foreground"
                    >
                      Current cycle
                    </Badge>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-2.5">
                    <Link
                      href={`/upload/${recipient.id}`}
                      aria-label={`${recipient.reportTitle}: upload report`}
                      className={cn(buttonVariants(), 'min-w-0')}
                    >
                      <Upload className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">Upload report</span>
                    </Link>
                    <Link
                      href={`/history/${recipient.id}`}
                      aria-label={`${recipient.reportTitle}: view history`}
                      className={cn(
                        buttonVariants({ variant: 'outline' }),
                        'min-w-0',
                      )}
                    >
                      <History className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">View history</span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
              <Vault className="size-4" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">
              No active recipients
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Add a recipient before uploading a report for this cycle.
            </p>
          </div>
        )}
      </section>

      <footer className="mt-10 flex flex-col gap-2 border-t border-border/80 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Retention cleanup is not automated yet.</p>
        <p className="font-mono uppercase tracking-[0.12em]">
          Recipient data / PostgreSQL
        </p>
      </footer>
    </main>
  );
}
