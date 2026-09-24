import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { ReportHistory } from '@/components/report-history';
import { toRecipientView } from '@/lib/recipient-display';
import { getRecipientById, RecipientNotFoundError } from '@/server/recipients';
import { listReportsForRecipient } from '@/server/reports';
import {
  parseRecipientId,
  RecipientValidationError,
} from '@/server/recipients/validation';

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ recipientId: string }>;
}) {
  const { recipientId } = await params;
  let recipient;
  let reports;

  try {
    recipient = await getRecipientById(parseRecipientId(recipientId));
    reports = await listReportsForRecipient(recipientId);
  } catch (error) {
    if (
      error instanceof RecipientNotFoundError ||
      error instanceof RecipientValidationError
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <AppShell active="recipients">
      <ReportHistory
        recipient={toRecipientView(recipient)}
        initialReports={reports.map((report) => ({
          id: report.id,
          date: report.reportDate,
          income: report.income,
          note: report.note,
          status: report.whatsappStatus,
          cycleId: report.cycleId,
          cycleNumber: report.cycleNumber,
          cycleStartedAt: report.cycleStartedAt.toISOString(),
          cycleEndedAt: report.cycleEndedAt?.toISOString() ?? null,
          cycleIsActive: report.cycleIsActive,
        }))}
      />
    </AppShell>
  );
}
