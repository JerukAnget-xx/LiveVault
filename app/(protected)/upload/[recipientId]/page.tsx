import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UploadReport } from '@/components/upload-report';
import { toRecipientView } from '@/lib/recipient-display';
import { getRecipientById, RecipientNotFoundError } from '@/server/recipients';
import {
  parseRecipientId,
  RecipientValidationError,
} from '@/server/recipients/validation';

export default async function UploadReportPage({
  params,
}: {
  params: Promise<{ recipientId: string }>;
}) {
  const { recipientId } = await params;
  let recipient;

  try {
    recipient = await getRecipientById(parseRecipientId(recipientId));
  } catch (error) {
    if (
      error instanceof RecipientNotFoundError ||
      error instanceof RecipientValidationError
    ) {
      notFound();
    }
    throw error;
  }

  if (!recipient.isActive) {
    return (
      <AppShell active="recipients">
        <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
          <PageHeader
            eyebrow={recipient.reportTitle}
            title="Recipient is inactive"
            description={`${recipient.name} cannot receive new reports until reactivated.`}
          />
          <Card className="mt-8 border-border/90 bg-card py-0">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <p className="text-sm leading-6 text-muted-foreground">
                Reactivate this recipient from the recipient directory, or view
                their existing report history.
              </p>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={`/history/${recipient.id}`}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  View history
                </Link>
                <Link href="/recipients/manage" className={buttonVariants()}>
                  Manage recipients
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell active="recipients">
      <UploadReport recipient={toRecipientView(recipient)} />
    </AppShell>
  );
}
