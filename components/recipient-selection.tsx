'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  Clock3,
  History,
  LogOut,
  Settings,
  Upload,
  Vault,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

type Recipient = {
  id: string;
  name: string;
  reportTitle: string;
  reportCount: number;
  initials: string;
};

type SelectedAction = {
  recipient: string;
  action: 'upload' | 'history';
} | null;

export function RecipientSelection({ recipients }: { recipients: Recipient[] }) {
  const [selectedAction, setSelectedAction] = useState<SelectedAction>(null);
  const totalReports = recipients.reduce(
    (total, recipient) => total + recipient.reportCount,
    0,
  );

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border/80 bg-background/95">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="#main-content"
            className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_22px_oklch(0.37_0.09_160/0.22)]">
              <Vault aria-hidden="true" className="size-5" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-[17px] font-semibold tracking-[-0.03em]">
                Live.Vault
              </span>
              <span className="block text-[11px] font-medium text-muted-foreground">
                Report workspace
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Open settings"
              className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <Settings aria-hidden="true" strokeWidth={1.8} />
            </Button>
            <Separator orientation="vertical" className="mx-1 hidden h-7 sm:block" />
            <div className="flex items-center gap-3 pl-1">
              <span className="grid size-9 place-items-center rounded-xl bg-secondary text-xs font-semibold text-secondary-foreground">
                AD
              </span>
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-tight">Admin</p>
                <p className="text-xs text-muted-foreground">Operator</p>
              </div>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Log out"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut aria-hidden="true" strokeWidth={1.8} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="grid items-end gap-6 border-b border-border pb-8 md:grid-cols-[minmax(0,1fr)_auto] md:pb-10">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Recipient selection
            </p>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Choose where this report belongs.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Start a new upload or review the active report list for a recipient.
            </p>
          </div>

          <div className="flex min-w-[280px] items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-[0_10px_30px_oklch(0.37_0.04_160/0.06)]">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Clock3 aria-hidden="true" className="size-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold">Cycle #4</p>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Active
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Started 3 October 2026
              </p>
            </div>
          </div>
        </section>

        <section className="pt-8 sm:pt-10" aria-labelledby="recipient-list-title">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 id="recipient-list-title" className="text-base font-semibold">
                Active recipients
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {recipients.length} recipients, {totalReports} reports in this cycle
              </p>
            </div>
            <Button
              variant="outline"
              className="hidden h-10 px-4 text-muted-foreground sm:inline-flex"
            >
              Manage recipients
              <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
            </Button>
          </div>

          {recipients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <h3 className="text-base font-semibold">No active recipients</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add or activate a recipient to begin reporting.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
              {recipients.map((recipient) => (
                <Card
                  key={recipient.id}
                  className="gap-0 border border-border/80 bg-card py-0 shadow-[0_12px_34px_oklch(0.37_0.04_160/0.055)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_42px_oklch(0.37_0.05_160/0.09)]"
                >
                  <CardHeader className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-5 sm:px-6 sm:py-6">
                    <span className="grid size-12 place-items-center rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground">
                      {recipient.initials}
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base font-semibold tracking-[-0.02em]">
                        {recipient.reportTitle}
                      </CardTitle>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {recipient.name}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-primary/20 text-primary">
                      Active
                    </Badge>
                  </CardHeader>

                  <Separator />

                  <CardContent className="grid gap-5 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6 sm:py-6">
                    <div>
                      <p className="font-mono text-3xl font-semibold tracking-[-0.06em]">
                        {recipient.reportCount.toString().padStart(2, '0')}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        Reports in active list
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <Button
                        variant="outline"
                        className="h-11 min-w-0 px-3 sm:min-w-[128px]"
                        onClick={() =>
                          setSelectedAction({
                            recipient: recipient.reportTitle,
                            action: 'history',
                          })
                        }
                      >
                        <History aria-hidden="true" data-icon="inline-start" />
                        View history
                      </Button>
                      <Button
                        className="h-11 min-w-0 px-3 shadow-[0_8px_18px_oklch(0.37_0.09_160/0.18)] sm:min-w-[128px]"
                        onClick={() =>
                          setSelectedAction({
                            recipient: recipient.reportTitle,
                            action: 'upload',
                          })
                        }
                      >
                        <Upload aria-hidden="true" data-icon="inline-start" />
                        Upload report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            className="mt-4 h-11 w-full text-muted-foreground sm:hidden"
          >
            Manage recipients
            <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
          </Button>
        </section>

        <footer className="mt-10 flex flex-col gap-2 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Reports are retained for the current month and previous 2 months.</p>
          <p>Frontend preview with sample data</p>
        </footer>
      </div>

      {selectedAction ? (
        <output
          aria-live="polite"
          className="fixed inset-x-4 bottom-4 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-primary/20 bg-foreground px-4 py-3 text-background shadow-[0_18px_50px_oklch(0.2_0.04_160/0.24)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:mx-0"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {selectedAction.action === 'upload'
                ? 'Upload report selected'
                : 'Report history selected'}
            </p>
            <p className="mt-0.5 text-xs text-background/70">
              {selectedAction.recipient}. This frontend preview is ready for route wiring.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss message"
            className="text-background hover:bg-background/10 hover:text-background"
            onClick={() => setSelectedAction(null)}
          >
            <X aria-hidden="true" />
          </Button>
        </output>
      ) : null}
    </main>
  );
}
