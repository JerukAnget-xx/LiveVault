import Link from 'next/link';
import { ArrowLeft, FileQuestion, Vault } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <FileQuestion className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Live.Vault
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The requested recipient or report page is not available in this
          frontend preview.
        </p>
        <Link href="/" className={`${buttonVariants()} mt-6`}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to recipients
        </Link>
        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Vault className="size-3.5" aria-hidden="true" />
          Live.Vault admin workspace
        </div>
      </div>
    </main>
  );
}
