import { AppShell } from '@/components/app-shell';
import { RecipientManager } from '@/components/recipient-manager';
import { toRecipientView } from '@/lib/recipient-display';
import { listRecipients } from '@/server/recipients';

export default async function ManageRecipientsPage() {
  const recipients = await listRecipients();

  return (
    <AppShell active="manage">
      <RecipientManager initialRecipients={recipients.map(toRecipientView)} />
    </AppShell>
  );
}
