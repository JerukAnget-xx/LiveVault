'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function ProtectedPageError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-lg flex-col items-center justify-center px-5 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-semibold">Unable to load Live.Vault</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The requested data could not be loaded safely. Try again in a moment.
      </p>
      <Button type="button" variant="outline" className="mt-6" onClick={reset}>
        <RotateCw className="size-4" aria-hidden="true" />
        Try again
      </Button>
    </main>
  );
}
