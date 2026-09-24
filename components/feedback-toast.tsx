'use client';

import { CheckCircle2, X } from 'lucide-react';

export type FeedbackMessage = {
  title: string;
  detail: string;
};

export function FeedbackToast({
  feedback,
  onDismiss,
}: {
  feedback: FeedbackMessage | null;
  onDismiss: () => void;
}) {
  if (!feedback) return null;

  return (
    <output
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-primary/25 bg-card p-4 text-card-foreground shadow-lg shadow-emerald-950/20 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:mx-0"
    >
      <CheckCircle2
        className="mt-0.5 size-4 shrink-0 text-primary"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{feedback.title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
          {feedback.detail}
        </span>
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Dismiss notification"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </output>
  );
}
