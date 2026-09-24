'use client';

import {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clipboard,
  FileCheck2,
  History,
  ImageUp,
  Save,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';

import {
  FeedbackToast,
  type FeedbackMessage,
} from '@/components/feedback-toast';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { RecipientView } from '@/lib/recipient-display';
import {
  ATTRIBUTED_GMV_METRIC,
  ATTRIBUTED_GMV_SOURCE_LABEL,
  extractReportLocally,
  formatIncomeIndonesia,
  parseAttributedGmvFromOcr,
  type ReportExtractionResult,
} from '@/lib/report-extraction';
import {
  applyExtractionResultToDraft,
  changeReportDate,
  createUploadReportDraft,
  prepareDraftForExtraction,
} from '@/lib/upload-report-draft';
import { cn } from '@/lib/utils';

type Stage = 'idle' | 'extracting' | 'ready';

type DuplicateReport = {
  id: string;
  reportDate: string;
  income: number;
  note: string | null;
};

type DuplicateCheck = {
  duplicateImages: DuplicateReport[];
  duplicateDates: DuplicateReport[];
};

type SavedReportResult = {
  report: { id: string };
  replaced: boolean;
  cleanupWarning: boolean;
};

const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
const demoOcrText = `
Attributed GMV (Rp) 17,288,439
GMV per hour 2.88M
Rp5.806.330
Rp1.148.455
`;

function formatReportDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  return match ? `${match[3]} / ${match[2]}` : '-- / --';
}

export function UploadReport({ recipient }: { recipient: RecipientView }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [extractionWarning, setExtractionWarning] = useState('');
  const [draft, setDraft] = useState(createUploadReportDraft);
  const [isDateEdited, setIsDateEdited] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [rawGmv, setRawGmv] = useState<number | null>(null);
  const [detectedIncome, setDetectedIncome] = useState<number | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<
    ReportExtractionResult['status'] | null
  >(null);
  const [metric, setMetric] = useState<ReportExtractionResult['metric'] | null>(
    null,
  );
  const [ocrProgress, setOcrProgress] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheck | null>(
    null,
  );
  const [duplicateDialog, setDuplicateDialog] = useState<
    'image' | 'date' | null
  >(null);
  const [pendingSendAfterSave, setPendingSendAfterSave] = useState(false);
  const numericIncome = Number(draft.income);
  const displayedIncome =
    Number.isSafeInteger(numericIncome) && numericIncome >= 0
      ? formatIncomeIndonesia(numericIncome)
      : '—';

  const showFeedback = (message: FeedbackMessage) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 3800);
  };

  const applyExtraction = useCallback((result: ReportExtractionResult) => {
    setDraft((current) => applyExtractionResultToDraft(current, result));
    setConfidence(result.confidence);
    setRawGmv(result.rawGmv);
    setDetectedIncome(result.income);
    setExtractionStatus(result.status);
    setMetric(result.metric);

    if (result.status === 'OK' && result.income !== null) {
      if (result.verificationRequired && result.confidence === null) {
        setExtractionWarning(
          'Confidence is unavailable. Verify the detected income before saving.',
        );
      } else if (result.verificationRequired) {
        setExtractionWarning(
          'Detection confidence is low. The value was preserved; verify it before saving.',
        );
      } else {
        setExtractionWarning('');
      }
      return;
    }

    setExtractionWarning(
      'Attributed GMV (Rp) was not found as a valid source metric. Enter the income manually.',
    );
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!acceptedTypes.includes(file.type)) {
        setError('Use a PNG, JPG, JPEG, or WebP image.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('The screenshot must be smaller than 10 MB.');
        return;
      }

      setError('');
      setExtractionWarning('');
      setDraft((current) => prepareDraftForExtraction(current));
      setConfidence(null);
      setRawGmv(null);
      setMetric(null);
      setOcrProgress(0);
      setFileName(file.name);
      setSelectedFile(file);
      setStage('extracting');

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);

      try {
        const result = await extractReportLocally(file, (progress) => {
          setOcrProgress(Math.round(progress.progress * 100));
        });
        applyExtraction(result);
      } catch {
        setExtractionWarning(
          'The screenshot could not be read locally. Enter the report values manually.',
        );
      } finally {
        setStage('ready');
      }
    },
    [applyExtraction],
  );

  useEffect(() => {
    const paste = (event: Event) => {
      const clipboardEvent = event as unknown as ClipboardEvent;
      const file = Array.from(clipboardEvent.clipboardData?.files ?? []).find(
        (item) => acceptedTypes.includes(item.type),
      );
      if (file) {
        event.preventDefault();
        void processFile(file);
      }
    };

    document.addEventListener('paste', paste);
    return () => document.removeEventListener('paste', paste);
  }, [processFile]);

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void processFile(file);
  };

  const loadDemo = () => {
    setPreviewUrl(null);
    setFileName('demo-live-report.png');
    setSelectedFile(null);
    setError('');
    setExtractionWarning('');
    setDraft((current) => prepareDraftForExtraction(current));
    setConfidence(null);
    setRawGmv(null);
    setDetectedIncome(null);
    setExtractionStatus(null);
    setMetric(null);
    setOcrProgress(0);
    setStage('extracting');
    window.setTimeout(() => {
      const result = parseAttributedGmvFromOcr(demoOcrText);

      if (result.status === 'GMV_NOT_FOUND') {
        setDraft((current) => prepareDraftForExtraction(current));
        setExtractionWarning(
          'Attributed GMV (Rp) was not found. Enter the income manually.',
        );
        setExtractionStatus('GMV_NOT_FOUND');
      } else {
        setDraft((current) =>
          applyExtractionResultToDraft(current, {
            status: 'OK',
            income: result.income,
          }),
        );
        setRawGmv(result.rawGmv);
        setDetectedIncome(result.income);
        setExtractionStatus('OK');
        setMetric(ATTRIBUTED_GMV_METRIC);
        setExtractionWarning(
          'Demo text has no OCR confidence. Verify the detected income before saving.',
        );
      }

      setStage('ready');
    }, 650);
  };

  const resetUpload = () => {
    setStage('idle');
    setPreviewUrl(null);
    setFileName('');
    setSelectedFile(null);
    setError('');
    setExtractionWarning('');
    setDraft((current) => prepareDraftForExtraction(current));
    setConfidence(null);
    setRawGmv(null);
    setDetectedIncome(null);
    setExtractionStatus(null);
    setMetric(null);
    setOcrProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const createReportFormData = (decisions?: {
    image: 'cancel' | 'upload_anyway';
    date: 'cancel' | 'replace' | 'add_second';
    replaceReportId?: string;
  }) => {
    if (!selectedFile) return null;
    const formData = new FormData();
    formData.set('recipientId', recipient.id);
    formData.set('reportDate', draft.reportDate);
    formData.set('income', draft.income);
    formData.set('note', draft.note);
    formData.set('image', selectedFile);
    if (detectedIncome !== null) {
      formData.set('detectedIncome', String(detectedIncome));
    }
    if (confidence !== null) formData.set('confidence', String(confidence));
    if (rawGmv !== null) formData.set('rawGmv', String(rawGmv));
    if (metric === ATTRIBUTED_GMV_METRIC) {
      formData.set('sourceLabel', ATTRIBUTED_GMV_SOURCE_LABEL);
    }
    if (extractionStatus) formData.set('extractionStatus', extractionStatus);
    if (decisions) {
      formData.set('imageDuplicateDecision', decisions.image);
      formData.set('dateDuplicateDecision', decisions.date);
      if (decisions.replaceReportId) {
        formData.set('replaceReportId', decisions.replaceReportId);
      }
    }
    return formData;
  };

  const readApiResponse = async <Result,>(response: Response) => {
    const body = (await response.json()) as {
      data?: Result;
      error?: { message?: string };
    };
    if (!response.ok || !body.data) {
      throw new Error(body.error?.message || 'The report could not be saved.');
    }
    return body.data;
  };

  const persistReport = async (
    decisions: {
      image: 'cancel' | 'upload_anyway';
      date: 'cancel' | 'replace' | 'add_second';
      replaceReportId?: string;
    },
    sendAfterSave = pendingSendAfterSave,
  ) => {
    const formData = createReportFormData(decisions);
    if (!formData) return;
    setDuplicateDialog(null);
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        body: formData,
      });
      const data = await readApiResponse<SavedReportResult>(response);
      if (sendAfterSave) {
        try {
          const sendResponse = await fetch(
            `/api/reports/${data.report.id}/send`,
            { method: 'POST' },
          );
          await readApiResponse(sendResponse);
          showFeedback({
            title: 'Report saved and sent',
            detail: 'One WhatsApp template message was accepted by Meta.',
          });
        } catch (sendError) {
          const message =
            sendError instanceof Error
              ? sendError.message
              : 'WhatsApp delivery failed.';
          showFeedback({
            title: 'Report saved successfully',
            detail: `WhatsApp delivery failed: ${message} Retry it from report history.`,
          });
        }
      } else {
        showFeedback({
          title: data.replaced ? 'Report replaced' : 'Report saved',
          detail: data.cleanupWarning
            ? 'The report is safe, but an old screenshot still needs cleanup.'
            : 'The screenshot and verified report values were saved securely.',
        });
      }
      setDuplicateCheck(null);
      setPendingSendAfterSave(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'The report could not be saved.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const continueAfterImageDecision = (check: DuplicateCheck) => {
    if (check.duplicateDates.length > 0) {
      setDuplicateDialog('date');
      return;
    }
    void persistReport({ image: 'upload_anyway', date: 'add_second' });
  };

  const saveReport = async (sendToWhatsApp: boolean, event?: FormEvent) => {
    event?.preventDefault();
    if (
      !draft.reportDate ||
      !draft.income ||
      !Number.isSafeInteger(Number(draft.income)) ||
      Number(draft.income) <= 0
    ) {
      setError('Enter a valid date and income before saving.');
      return;
    }
    if (!selectedFile) {
      setError('Add a screenshot before saving the report.');
      return;
    }

    setError('');
    setPendingSendAfterSave(sendToWhatsApp);
    setIsSaving(true);
    try {
      const formData = createReportFormData();
      if (!formData) return;
      const response = await fetch('/api/reports/check', {
        method: 'POST',
        body: formData,
      });
      const check = await readApiResponse<DuplicateCheck>(response);
      setDuplicateCheck(check);
      if (check.duplicateImages.length > 0) {
        setDuplicateDialog('image');
      } else if (check.duplicateDates.length > 0) {
        setDuplicateDialog('date');
      } else {
        await persistReport(
          { image: 'upload_anyway', date: 'add_second' },
          sendToWhatsApp,
        );
      }
    } catch (checkError) {
      setError(
        checkError instanceof Error
          ? checkError.message
          : 'The report could not be checked.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <PageHeader
        eyebrow={recipient.reportTitle}
        title="Upload report"
        description="Paste or upload a screenshot, verify the detected values, then save or send."
        action={
          <Link
            href={`/history/${recipient.id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            <History className="size-4" aria-hidden="true" />
            View history
          </Link>
        }
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(21rem,0.95fr)]">
        <Card className="border-border/90 bg-card py-0">
          <CardHeader className="border-b border-border/70 px-5 py-4 sm:px-6">
            <CardTitle className="text-sm font-semibold">
              Screenshot input
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileInput}
              className="sr-only"
              aria-label="Upload screenshot"
            />

            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
                isDragging
                  ? 'border-primary bg-primary/8'
                  : 'border-border bg-background/45',
              )}
            >
              {stage === 'idle' ? (
                <>
                  <span className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <ImageUp className="size-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-base font-semibold">
                    Paste screenshot
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Press Ctrl + V anywhere, drag an image here, or choose a
                    file.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                    >
                      <Upload className="size-4" aria-hidden="true" />
                      Choose image
                    </Button>
                    <Button type="button" variant="outline" onClick={loadDemo}>
                      <Sparkles className="size-4" aria-hidden="true" />
                      Load demo
                    </Button>
                  </div>
                  <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                    PNG, JPG, JPEG, WEBP / MAX 10 MB
                  </p>
                </>
              ) : stage === 'extracting' ? (
                <div className="w-full max-w-sm" aria-live="polite">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Sparkles className="size-5" aria-hidden="true" />
                  </div>
                  <p className="mt-5 text-sm font-semibold">
                    Reading screenshot locally
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {fileName}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-primary">
                    OCR {ocrProgress}%
                  </p>
                  <div className="mt-6 space-y-3">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-4/5" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ) : previewUrl ? (
                <div className="w-full">
                  {/* oxlint-disable-next-line next/no-img-element -- Blob previews must bypass the Next image optimizer. */}
                  <img
                    src={previewUrl}
                    alt="Uploaded report screenshot preview"
                    width={900}
                    height={1200}
                    className="mx-auto max-h-[32rem] w-auto max-w-full rounded-lg border border-border object-contain"
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-xs truncate text-xs text-muted-foreground">
                      {fileName}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetUpload}
                    >
                      Replace image
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <FileCheck2 className="size-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-base font-semibold">
                    Demo extraction ready
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Use the detected sample values or replace them with your
                    screenshot.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-5"
                    onClick={resetUpload}
                  >
                    Add screenshot
                  </Button>
                </div>
              )}
            </div>

            {error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Check required</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {extractionWarning ? (
              <Alert className="mt-4 border-amber-500/30 bg-amber-500/8 text-amber-100">
                <AlertTitle>Verification required</AlertTitle>
                <AlertDescription className="text-amber-100/75">
                  {extractionWarning}
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/90 bg-card py-0">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
              <CardTitle className="text-sm font-semibold">
                Detected data
              </CardTitle>
              {stage === 'ready' ? (
                <Badge
                  variant="outline"
                  className={cn(
                    confidence !== null && confidence >= 0.8
                      ? 'border-primary/25 bg-primary/10 text-primary'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-200',
                  )}
                >
                  {confidence === null
                    ? 'Confidence unavailable'
                    : `${Math.round(confidence * 100)}% confidence`}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Waiting
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="report-date">Date</Label>
                <Input
                  id="report-date"
                  type="date"
                  value={draft.reportDate}
                  onChange={(event) => {
                    setDraft((current) =>
                      changeReportDate(current, event.target.value),
                    );
                    setIsDateEdited(true);
                  }}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  {isDateEdited
                    ? 'Admin-selected calendar date.'
                    : 'Defaults to today in Asia/Jakarta.'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="income">Income</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    id="income"
                    type="number"
                    min="1"
                    step="1"
                    value={draft.income}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        income: event.target.value,
                      }))
                    }
                    disabled={stage !== 'ready'}
                    className="h-10 pl-9 font-mono"
                  />
                </div>
                {rawGmv !== null && metric === ATTRIBUTED_GMV_METRIC ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Source: {ATTRIBUTED_GMV_SOURCE_LABEL} / raw Rp{' '}
                    {new Intl.NumberFormat('id-ID').format(rawGmv)}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">
                  Note{' '}
                  <span className="font-normal text-muted-foreground">
                    Optional
                  </span>
                </Label>
                <Textarea
                  id="note"
                  value={draft.note}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  disabled={stage !== 'ready'}
                  placeholder="Example: Bonus Event"
                  className="min-h-24"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/90 bg-card py-0">
            <CardHeader className="border-b border-border/70 px-5 py-4 sm:px-6">
              <CardTitle className="text-sm font-semibold">
                Report preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <div className="rounded-lg border border-border bg-background/45 p-4 font-mono text-xs leading-7">
                <p className="font-semibold text-primary">
                  {'//'} {recipient.reportTitle} :
                </p>
                <p className="mt-2 text-muted-foreground">07 / 10 : 10.400</p>
                {stage === 'ready' ? (
                  <p className="text-foreground">
                    {formatReportDate(draft.reportDate)} : {displayedIncome}
                    {draft.note ? ` (${draft.note})` : ''}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Upload a screenshot to add the next entry.
                  </p>
                )}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={stage !== 'ready' || isSaving}
                  onClick={() => void saveReport(false)}
                >
                  <Save className="size-4" aria-hidden="true" />
                  {isSaving ? 'Saving…' : 'Save only'}
                </Button>
                <Button
                  type="button"
                  disabled={stage !== 'ready' || isSaving}
                  onClick={() => void saveReport(true)}
                >
                  <Send className="size-4" aria-hidden="true" />
                  {isSaving ? 'Saving…' : 'Save and send'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: 'link', size: 'sm' }),
                'px-0',
              )}
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to recipients
            </Link>
            <span className="hidden items-center gap-1.5 sm:flex">
              <Clipboard className="size-3.5" aria-hidden="true" />
              Paste works anywhere
            </span>
          </div>
        </div>
      </div>

      <FeedbackToast feedback={feedback} onDismiss={() => setFeedback(null)} />

      <Dialog
        open={duplicateDialog === 'image'}
        onOpenChange={(open) => {
          if (!open) setDuplicateDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              This screenshot has already been uploaded.
            </DialogTitle>
            <DialogDescription>
              {duplicateCheck?.duplicateImages.length ?? 0} matching report(s)
              use the same original image bytes. No data has been saved yet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDuplicateDialog(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (duplicateCheck) continueAfterImageDecision(duplicateCheck);
              }}
            >
              Upload anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={duplicateDialog === 'date'}
        onOpenChange={(open) => {
          if (!open) setDuplicateDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              A report already exists for this recipient and date.
            </DialogTitle>
            <DialogDescription>
              Cancel, add another report, or select the exact existing report to
              replace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {duplicateCheck?.duplicateDates.map((report) => (
              <Button
                key={report.id}
                type="button"
                variant="outline"
                className="h-auto w-full justify-between py-3"
                onClick={() =>
                  void persistReport({
                    image: 'upload_anyway',
                    date: 'replace',
                    replaceReportId: report.id,
                  })
                }
              >
                <span>Replace {report.reportDate}</span>
                <span className="font-mono text-muted-foreground">
                  Rp {formatIncomeIndonesia(report.income)}
                </span>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDuplicateDialog(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() =>
                void persistReport({
                  image: 'upload_anyway',
                  date: 'add_second',
                })
              }
            >
              Add second report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
