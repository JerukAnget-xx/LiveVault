'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Database,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

import {
  FeedbackToast,
  type FeedbackMessage,
} from '@/components/feedback-toast';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

type AuditEntry = {
  id: string;
  previousCycle: number;
  newCycle: number;
  performedBy: string;
  resetAt: string;
};

export function ReportSettings() {
  const [cycle, setCycle] = useState(4);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([
    {
      id: 'audit-3',
      previousCycle: 2,
      newCycle: 3,
      performedBy: 'Admin',
      resetAt: '28 Sep 2026, 09:14',
    },
    {
      id: 'audit-4',
      previousCycle: 3,
      newCycle: 4,
      performedBy: 'Admin',
      resetAt: '03 Oct 2026, 08:42',
    },
  ]);

  const confirmReset = () => {
    const nextCycle = cycle + 1;
    setAuditEntries((current) => [
      ...current,
      {
        id: `audit-${nextCycle}`,
        previousCycle: cycle,
        newCycle: nextCycle,
        performedBy: 'Admin',
        resetAt: '10 Oct 2026, 14:32',
      },
    ]);
    setCycle(nextCycle);
    setResetStep(0);
    setFeedback({
      title: `Cycle #${nextCycle} started`,
      detail: 'All recipient lists were reset in the local frontend preview.',
    });
    window.setTimeout(() => setFeedback(null), 3800);
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <PageHeader
        title="Report management"
        description="Control the global report cycle and review fixed data retention settings."
      />

      <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
        <Card className="border-border/90 bg-card py-0">
          <CardHeader className="flex flex-row items-start justify-between border-b border-border/70 px-5 py-5 sm:px-6">
            <div>
              <CardTitle className="text-sm font-semibold">
                Current active cycle
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                One global cycle applies to all recipients.
              </p>
            </div>
            <Badge className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/10">
              Active
            </Badge>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="font-mono text-4xl font-semibold tracking-tight">
                  #{cycle}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Started 03 October 2026
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold">42</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Total reports
                </p>
              </div>
            </div>
            <div className="mt-7 rounded-lg border border-border bg-background/45 p-4 text-sm leading-6 text-muted-foreground">
              Resetting starts a new list for every recipient. Existing reports
              stay archived until their retention limit.
            </div>
            <Button
              type="button"
              variant="destructive"
              className="mt-5"
              onClick={() => setResetStep(1)}
            >
              <RefreshCcw className="size-4" aria-hidden="true" />
              Reset all report lists
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/[0.045] py-0">
          <CardHeader className="border-b border-primary/15 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm font-semibold">
                Data retention
              </CardTitle>
              <Database className="size-4 text-primary" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <dl className="space-y-5">
              <div>
                <dt className="text-xs text-muted-foreground">
                  Storage period
                </dt>
                <dd className="mt-1 text-sm font-semibold">
                  Current month and previous 2 months
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Oldest available
                </dt>
                <dd className="mt-1 font-mono text-sm font-semibold">
                  July 2026
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-primary/15 pt-5">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Automatic cleanup
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">Enabled</dd>
                </div>
                <Switch
                  checked
                  disabled
                  aria-label="Automatic cleanup enabled"
                />
              </div>
            </dl>
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/[0.045] p-4">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Cleanup removes old report records and screenshots. It never
                resets the active cycle.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8" aria-labelledby="audit-heading">
        <div className="mb-4">
          <h2 id="audit-heading" className="text-sm font-semibold">
            Reset audit log
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Recent cycle changes recorded for this workspace.
          </p>
        </div>
        <Card className="border-border/90 bg-card py-0">
          <CardContent className="p-0">
            {auditEntries
              .slice()
              .reverse()
              .map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-3 border-b border-border/60 px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        Cycle #{entry.previousCycle} to Cycle #{entry.newCycle}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Performed by {entry.performedBy}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {entry.resetAt}
                  </span>
                  <Badge
                    variant="outline"
                    className="w-fit text-muted-foreground"
                  >
                    Completed
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </section>

      <Dialog
        open={resetStep > 0}
        onOpenChange={(open) => {
          if (!open) setResetStep(0);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <span className="mb-1 flex size-10 items-center justify-center rounded-lg border border-destructive/25 bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>
              {resetStep === 1 ? 'Reset all report lists?' : 'Are you sure?'}
            </DialogTitle>
            <DialogDescription>
              {resetStep === 1
                ? 'This starts a new report list for all recipients. Existing reports remain available until their retention limit.'
                : 'Previous lists will be archived. Older retained data may still be removed automatically.'}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-background/45 p-4 text-xs leading-5 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock3 className="size-3.5 text-primary" aria-hidden="true" />
              Cycle #{cycle} becomes archived
            </div>
            <div className="mt-2 flex items-center gap-2">
              <CheckCircle2
                className="size-3.5 text-primary"
                aria-hidden="true"
              />
              Cycle #{cycle + 1} becomes active
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetStep(0)}
            >
              Cancel
            </Button>
            {resetStep === 1 ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setResetStep(2)}
              >
                Reset all lists
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={confirmReset}
              >
                Yes, reset
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackToast feedback={feedback} onDismiss={() => setFeedback(null)} />
    </main>
  );
}
