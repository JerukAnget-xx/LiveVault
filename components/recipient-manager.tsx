'use client';

import { type SyntheticEvent, useState } from 'react';
import {
  LoaderCircle,
  Pencil,
  Plus,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  FeedbackToast,
  type FeedbackMessage,
} from '@/components/feedback-toast';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  recipientInitials,
  toRecipientView,
  type RecipientView,
} from '@/lib/recipient-display';

type Draft = Pick<
  RecipientView,
  'id' | 'name' | 'reportTitle' | 'whatsappNumber' | 'isActive'
>;

type RecipientApiEnvelope = {
  data?: RecipientView;
  error?: {
    message?: string;
    issues?: Array<{ message?: string }>;
  };
};

class RecipientRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'RecipientRequestError';
    this.status = status;
  }
}

const emptyDraft: Draft = {
  id: '',
  name: '',
  reportTitle: '',
  whatsappNumber: '62',
  isActive: true,
};

function sortRecipients(recipients: RecipientView[]) {
  return recipients.toSorted((left, right) =>
    left.name.localeCompare(right.name),
  );
}

async function requestRecipient(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response
    .json()
    .catch(() => null)) as RecipientApiEnvelope | null;

  if (!response.ok) {
    throw new RecipientRequestError(
      response.status,
      payload?.error?.issues?.[0]?.message ??
        payload?.error?.message ??
        'The recipient operation could not be completed.',
    );
  }

  if (!payload?.data) {
    throw new RecipientRequestError(
      500,
      'The recipient operation could not be completed.',
    );
  }

  return toRecipientView(payload.data);
}

export function RecipientManager({
  initialRecipients,
}: {
  initialRecipients: RecipientView[];
}) {
  const router = useRouter();
  const [recipients, setRecipients] = useState(initialRecipients);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingRecipientId, setPendingRecipientId] = useState<string | null>(
    null,
  );
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const notify = (message: FeedbackMessage) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 3600);
  };

  const safeError = (requestError: unknown) => {
    if (requestError instanceof RecipientRequestError) {
      if (requestError.status === 401) {
        router.replace('/login');
        router.refresh();
        return 'Your session has expired. Sign in again.';
      }

      return requestError.message;
    }

    return 'The recipient operation could not be completed.';
  };

  const openAdd = () => {
    setDraft({ ...emptyDraft });
    setError('');
    setActionError('');
  };

  const openEdit = (recipient: RecipientView) => {
    setDraft({ ...recipient });
    setError('');
    setActionError('');
  };

  const saveRecipient = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || saving) return;

    if (!draft.name.trim() || !draft.reportTitle.trim()) {
      setError('Recipient name and report title are required.');
      return;
    }
    if (!/^62\d{6,13}$/.test(draft.whatsappNumber)) {
      setError('Use 8–15 digits beginning with Indonesian country code 62.');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const isEditing = Boolean(draft.id);
      const recipient = await requestRecipient(
        isEditing ? `/api/recipients/${draft.id}` : '/api/recipients',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: draft.name,
            whatsappNumber: draft.whatsappNumber,
            reportTitle: draft.reportTitle,
            isActive: draft.isActive,
          }),
        },
      );

      setRecipients((current) =>
        sortRecipients(
          isEditing
            ? current.map((item) =>
                item.id === recipient.id ? recipient : item,
              )
            : [...current, recipient],
        ),
      );
      setDraft(null);
      notify({
        title: isEditing ? 'Recipient updated' : 'Recipient added',
        detail: `${recipient.name} was saved successfully.`,
      });
      router.refresh();
    } catch (requestError) {
      setError(safeError(requestError));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (recipient: RecipientView, isActive: boolean) => {
    if (pendingRecipientId) return;
    setActionError('');
    setPendingRecipientId(recipient.id);

    try {
      const updatedRecipient = await requestRecipient(
        `/api/recipients/${recipient.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive }),
        },
      );

      setRecipients((current) =>
        current.map((item) =>
          item.id === updatedRecipient.id ? updatedRecipient : item,
        ),
      );
      notify({
        title: isActive ? 'Recipient activated' : 'Recipient deactivated',
        detail: `${updatedRecipient.name} is now ${isActive ? 'active' : 'inactive'}.`,
      });
      router.refresh();
    } catch (requestError) {
      setActionError(safeError(requestError));
    } finally {
      setPendingRecipientId(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <PageHeader
        title="Manage recipients"
        description="Add recipients, update report titles and WhatsApp numbers, or change availability."
        action={
          <Button type="button" onClick={openAdd} disabled={saving}>
            <Plus className="size-4" aria-hidden="true" />
            Add recipient
          </Button>
        }
      />

      {actionError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Recipient update failed</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="mt-8" aria-labelledby="recipient-table-heading">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="recipient-table-heading" className="text-sm font-semibold">
              Recipient directory
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {recipients.filter((recipient) => recipient.isActive).length}{' '}
              active / {recipients.length} total
            </p>
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            PostgreSQL
          </Badge>
        </div>

        {recipients.length > 0 ? (
          <>
            <Card className="hidden border-border/90 bg-card py-0 md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Recipient name</TableHead>
                      <TableHead>Report title</TableHead>
                      <TableHead>WhatsApp number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-5 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.map((recipient) => {
                      const statusPending = pendingRecipientId === recipient.id;
                      return (
                        <TableRow key={recipient.id}>
                          <TableCell className="pl-5">
                            <div className="flex items-center gap-3">
                              <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-[11px] font-semibold text-primary">
                                {recipientInitials(recipient.name)}
                              </span>
                              <p className="font-medium">{recipient.name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {recipient.reportTitle}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {recipient.whatsappNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex w-fit items-center gap-2 text-xs text-muted-foreground">
                              <Switch
                                checked={recipient.isActive}
                                disabled={Boolean(pendingRecipientId)}
                                onCheckedChange={(checked) =>
                                  toggleActive(recipient, checked)
                                }
                                aria-label={`${recipient.name} active status`}
                              />
                              <span>
                                {statusPending
                                  ? 'Saving…'
                                  : recipient.isActive
                                    ? 'Active'
                                    : 'Inactive'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={Boolean(pendingRecipientId)}
                              onClick={() => openEdit(recipient)}
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-3 md:hidden">
              {recipients.map((recipient) => (
                <Card
                  key={recipient.id}
                  className="border-border/90 bg-card py-0"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-[11px] font-semibold text-primary">
                        {recipientInitials(recipient.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{recipient.name}</p>
                        <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                          {recipient.reportTitle}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${recipient.name}`}
                        disabled={Boolean(pendingRecipientId)}
                        onClick={() => openEdit(recipient)}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                    <dl className="mt-5 border-t border-border/60 pt-4 text-xs">
                      <dt className="text-muted-foreground">WhatsApp number</dt>
                      <dd className="mt-1 font-mono">
                        {recipient.whatsappNumber}
                      </dd>
                    </dl>
                    <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-sm">
                      <span>
                        {pendingRecipientId === recipient.id
                          ? 'Saving…'
                          : recipient.isActive
                            ? 'Active'
                            : 'Inactive'}
                      </span>
                      <Switch
                        checked={recipient.isActive}
                        disabled={Boolean(pendingRecipientId)}
                        onCheckedChange={(checked) =>
                          toggleActive(recipient, checked)
                        }
                        aria-label={`${recipient.name} active status`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
            <Users
              className="mx-auto size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-4 text-sm font-semibold">No recipients yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add the first recipient to begin routing reports.
            </p>
            <Button type="button" className="mt-5" onClick={openAdd}>
              <Plus className="size-4" aria-hidden="true" />
              Add recipient
            </Button>
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(draft)}
        onOpenChange={(open) => {
          if (!open && !saving) setDraft(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? 'Edit recipient' : 'Add recipient'}
            </DialogTitle>
            <DialogDescription>
              WhatsApp numbers use country code format without spaces or a plus
              sign.
            </DialogDescription>
          </DialogHeader>
          {draft ? (
            <form
              id="recipient-form"
              onSubmit={saveRecipient}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="recipient-name">Recipient name</Label>
                <Input
                  id="recipient-name"
                  value={draft.name}
                  disabled={saving}
                  required
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  aria-invalid={Boolean(error)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp-number">WhatsApp number</Label>
                <Input
                  id="whatsapp-number"
                  inputMode="numeric"
                  value={draft.whatsappNumber}
                  disabled={saving}
                  required
                  onChange={(event) =>
                    setDraft({ ...draft, whatsappNumber: event.target.value })
                  }
                  placeholder="628123456789"
                  aria-invalid={Boolean(error)}
                />
                <p className="text-xs text-muted-foreground">
                  Example: 628123456789
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-title">Report title</Label>
                <Input
                  id="report-title"
                  value={draft.reportTitle}
                  disabled={saving}
                  required
                  onChange={(event) =>
                    setDraft({ ...draft, reportTitle: event.target.value })
                  }
                  placeholder="AYU LIVE"
                  aria-invalid={Boolean(error)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-3 text-sm">
                <span>
                  <span className="block font-medium">Status</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Active recipients can receive new reports.
                  </span>
                </span>
                <Switch
                  checked={draft.isActive}
                  disabled={saving}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, isActive: checked })
                  }
                  aria-label="Recipient active status"
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          ) : null}
          <DialogFooter>
            <Button type="submit" form="recipient-form" disabled={saving}>
              {saving ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <UserRoundCheck className="size-4" aria-hidden="true" />
              )}
              {saving ? 'Saving…' : 'Save recipient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackToast feedback={feedback} onDismiss={() => setFeedback(null)} />
    </main>
  );
}
