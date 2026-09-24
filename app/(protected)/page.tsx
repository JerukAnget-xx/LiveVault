import { AppShell } from '@/components/app-shell';
import { RecipientSelection } from '@/components/recipient-selection';
import { toRecipientView } from '@/lib/recipient-display';
import { requireSession } from '@/server/auth';
import { listRecipients } from '@/server/recipients';
import { getActiveReportCycle } from '@/server/report-cycles';
import { listReportCountsForCycle } from '@/server/reports';

export default async function Home() {
  const [{ user }, recipients] = await Promise.all([
    requireSession(),
    listRecipients({ activeOnly: true }),
  ]);
  const cycle = await getActiveReportCycle(user.id);
  const counts = new Map(
    (await listReportCountsForCycle(cycle.id)).map((item) => [
      item.recipientId,
      item.count,
    ]),
  );

  return (
    <AppShell active="recipients">
      <RecipientSelection
        cycle={{
          number: cycle.cycleNumber,
          startedAt: cycle.startedAt.toISOString(),
        }}
        recipients={recipients.map((recipient) => ({
          ...toRecipientView(recipient),
          activeReportCount: counts.get(recipient.id) ?? 0,
        }))}
      />
    </AppShell>
  );
}
