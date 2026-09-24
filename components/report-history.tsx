'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  CalendarDays,
  Check,
  Clipboard,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';

import {
  FeedbackToast,
  type FeedbackMessage,
} from '@/components/feedback-toast';
import { PageHeader } from '@/components/page-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatIncomeIndonesia } from '@/lib/report-extraction';
import type { RecipientView } from '@/lib/recipient-display';

type Report = {
  id: string;
  date: string;
  income: number;
  note: string | null;
  status: 'not_sent' | 'queued' | 'sending' | 'sent' | 'failed';
  cycleId: string;
  cycleNumber: number;
  cycleStartedAt: string;
  cycleEndedAt: string | null;
  cycleIsActive: boolean;
};

function displayDate(date: string) {
  const [, month, day] = date.split('-');
  return `${day} / ${month}`;
}

function formatReportLine(report: Report) {
  return `${displayDate(report.date)} : ${formatIncomeIndonesia(report.income)}${report.note ? ` (${report.note})` : ''}`;
}

function formatCycleDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: Report['status'] }) {
  if (status === 'sent') {
    return (
      <Badge className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/10">
        Sent
      </Badge>
    );
  }
  if (status === 'failed') {
    return <Badge variant="destructive">Failed</Badge>;
  }
  if (status === 'queued' || status === 'sending') {
    return (
      <Badge variant="outline" className="border-amber-500/30 text-amber-200">
        {status === 'queued' ? 'Queued' : 'Sending'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Not sent
    </Badge>
  );
}

export function ReportHistory({
  recipient,
  initialReports,
}: {
  recipient: RecipientView;
  initialReports: Report[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [selectedCycle, setSelectedCycle] = useState('active');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editing, setEditing] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState<Report | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const cycles = useMemo(() => {
    const byId = new Map<string, Report>();
    for (const report of reports) byId.set(report.cycleId, report);
    return Array.from(byId.values()).toSorted(
      (left, right) => right.cycleNumber - left.cycleNumber,
    );
  }, [reports]);

  const visibleReports = useMemo(() => {
    const source = reports.filter((report) =>
      selectedCycle === 'active'
        ? report.cycleIsActive
        : report.cycleId === selectedCycle,
    );
    return source.filter(
      (report) =>
        (!dateFrom || report.date >= dateFrom) &&
        (!dateTo || report.date <= dateTo),
    );
  }, [dateFrom, dateTo, reports, selectedCycle]);

  const selectedCycleInfo = cycles.find(
    (cycle) => cycle.cycleId === selectedCycle,
  );

  const notify = (message: FeedbackMessage) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 3600);
  };

  const copyList = async () => {
    const text = [
      `// ${recipient.reportTitle} :`,
      '',
      ...visibleReports.map(formatReportLine),
    ].join('\n');
    await navigator.clipboard.writeText(text);
    notify({
      title: 'List copied',
      detail: `${visibleReports.length} report entries copied to the clipboard.`,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setIsMutating(true);
    try {
      const response = await fetch(`/api/reports/${editing.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reportDate: editing.date,
          income: editing.income,
          note: editing.note,
        }),
      });
      const body = (await response.json()) as {
        data?: { reportDate: string; income: number; note: string | null };
        error?: { message?: string };
      };
      if (!response.ok || !body.data) {
        throw new Error(
          body.error?.message || 'The report could not be updated.',
        );
      }
      setReports((current) =>
        current.map((report) =>
          report.id === editing.id
            ? {
                ...report,
                date: body.data!.reportDate,
                income: body.data!.income,
                note: body.data!.note,
              }
            : report,
        ),
      );
      setEditing(null);
      notify({
        title: 'Report updated',
        detail: 'The report metadata was saved.',
      });
    } catch (error) {
      notify({
        title: 'Update failed',
        detail: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsMutating(true);
    try {
      const response = await fetch(`/api/reports/${deleting.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const body = (await response.json()) as {
          error?: { message?: string };
        };
        throw new Error(
          body.error?.message || 'The report could not be deleted.',
        );
      }
      setReports((current) =>
        current.filter((report) => report.id !== deleting.id),
      );
      setDeleting(null);
      notify({
        title: 'Report removed',
        detail: 'The screenshot and report row were deleted.',
      });
    } catch (error) {
      notify({
        title: 'Delete failed',
        detail: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const retryWhatsApp = async (report: Report) => {
    setIsMutating(true);
    try {
      const response = await fetch(`/api/reports/${report.id}/retry-whatsapp`, {
        method: 'POST',
      });
      const body = (await response.json()) as {
        data?: { attempt: { status: Report['status'] } };
        error?: { message?: string };
      };
      if (!response.ok || !body.data) {
        throw new Error(body.error?.message || 'WhatsApp retry failed.');
      }
      setReports((current) =>
        current.map((item) =>
          item.id === report.id
            ? { ...item, status: body.data!.attempt.status }
            : item,
        ),
      );
      notify({
        title: 'WhatsApp sent',
        detail: 'A new delivery attempt was accepted by Meta.',
      });
    } catch (error) {
      notify({
        title: 'WhatsApp retry failed',
        detail: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <PageHeader
        eyebrow={recipient.reportTitle}
        title="Report history"
        description="Review retained text-only lists, filter dates, and manage active report entries."
        action={
          recipient.isActive ? (
            <Link href={`/upload/${recipient.id}`} className={buttonVariants()}>
              <Upload className="size-4" aria-hidden="true" />
              Upload new report
            </Link>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Inactive recipient
            </Badge>
          )
        }
      />

      <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <Card className="border-border/90 bg-card py-0">
          <CardHeader className="gap-4 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <CardTitle className="text-sm font-semibold">
                {selectedCycle === 'active'
                  ? 'Active list'
                  : `Archived list: Cycle #${selectedCycleInfo?.cycleNumber}`}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedCycle === 'active'
                  ? cycles.find((cycle) => cycle.cycleIsActive)
                    ? `Cycle #${cycles.find((cycle) => cycle.cycleIsActive)?.cycleNumber} / Started ${formatCycleDate(cycles.find((cycle) => cycle.cycleIsActive)!.cycleStartedAt)}`
                    : 'No active reports yet'
                  : selectedCycleInfo
                    ? `${formatCycleDate(selectedCycleInfo.cycleStartedAt)} - ${selectedCycleInfo.cycleEndedAt ? formatCycleDate(selectedCycleInfo.cycleEndedAt) : 'Active'}`
                    : ''}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyList}
              disabled={visibleReports.length === 0}
            >
              <Clipboard className="size-3.5" aria-hidden="true" />
              Copy list
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-b border-border/70 bg-background/30 px-5 py-4 sm:px-6">
              <p className="font-mono text-xs font-semibold text-primary">
                {'//'} {recipient.reportTitle} :
              </p>
            </div>
            {visibleReports.length > 0 ? (
              <div>
                {visibleReports.map((report) => (
                  <div
                    key={report.id}
                    className="grid gap-4 border-b border-border/60 px-5 py-4 last:border-b-0 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                  >
                    <p className="font-mono text-sm font-semibold">
                      {displayDate(report.date)}
                    </p>
                    <div>
                      <p className="font-mono text-sm">
                        Rp {formatIncomeIndonesia(report.income)}
                      </p>
                      {report.note ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {report.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={report.status} />
                      {selectedCycle === 'active' ? (
                        <>
                          {report.status === 'failed' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={isMutating}
                              aria-label={`Retry WhatsApp for ${displayDate(report.date)}`}
                              onClick={() => void retryWhatsApp(report)}
                            >
                              <RotateCcw
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit report for ${displayDate(report.date)}`}
                            onClick={() => setEditing({ ...report })}
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete report for ${displayDate(report.date)}`}
                            onClick={() => setDeleting(report)}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <CalendarDays
                  className="mx-auto size-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-sm font-semibold">
                  No reports in this range
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Clear the date filters or select another retained cycle.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/90 bg-card py-0">
            <CardHeader className="border-b border-border/70 px-5 py-4">
              <CardTitle className="text-sm font-semibold">
                History filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedCycle === 'active' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCycle('active')}
                >
                  Active cycle
                </Button>
                <Button
                  type="button"
                  variant={selectedCycle !== 'active' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const previous = cycles.find(
                      (cycle) => !cycle.cycleIsActive,
                    );
                    if (previous) setSelectedCycle(previous.cycleId);
                  }}
                  disabled={!cycles.some((cycle) => !cycle.cycleIsActive)}
                >
                  Previous cycle
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date-from">From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-to">To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                  />
                </div>
              </div>
              {dateFrom || dateTo ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  Clear date range
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/90 bg-card py-0">
            <CardHeader className="border-b border-border/70 px-5 py-4">
              <CardTitle className="text-sm font-semibold">
                Previous lists
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {cycles
                .filter((cycle) => !cycle.cycleIsActive)
                .map((cycle) => (
                  <button
                    key={cycle.cycleId}
                    type="button"
                    onClick={() => setSelectedCycle(cycle.cycleId)}
                    className="flex w-full items-center gap-3 border-b border-border/60 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <Archive
                      className="size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        Cycle #{cycle.cycleNumber}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatCycleDate(cycle.cycleStartedAt)} -{' '}
                        {cycle.cycleEndedAt
                          ? formatCycleDate(cycle.cycleEndedAt)
                          : 'Active'}
                      </span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {
                        reports.filter(
                          (report) => report.cycleId === cycle.cycleId,
                        ).length
                      }
                    </span>
                  </button>
                ))}
            </CardContent>
          </Card>

          <div className="rounded-xl border border-primary/15 bg-primary/[0.045] p-5">
            <h2 className="text-sm font-semibold">Data retention</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Screenshot retention is not automated yet. Stored reports remain
              available until an admin explicitly deletes them.
            </p>
          </div>
        </div>
      </section>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit report</DialogTitle>
            <DialogDescription>
              Update stored values. Previous WhatsApp messages will not change.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editing.date}
                  onChange={(event) =>
                    setEditing({ ...editing, date: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-income">Income</Label>
                <Input
                  id="edit-income"
                  type="number"
                  value={editing.income}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      income: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-note">Note</Label>
                <Textarea
                  id="edit-note"
                  value={editing.note ?? ''}
                  onChange={(event) =>
                    setEditing({ ...editing, note: event.target.value })
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              onClick={() => void saveEdit()}
              disabled={isMutating}
            >
              <Check className="size-4" aria-hidden="true" />
              {isMutating ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="size-5 text-destructive" aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete report?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `${displayDate(deleting.date)} / Rp ${formatIncomeIndonesia(deleting.income)}. Its private screenshot will also be deleted.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={isMutating}
            >
              {isMutating ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackToast feedback={feedback} onDismiss={() => setFeedback(null)} />
    </main>
  );
}
