import { AppShell } from '@/components/app-shell';
import { ReportSettings } from '@/components/report-settings';

export default function SettingsPage() {
  return (
    <AppShell active="settings">
      <ReportSettings />
    </AppShell>
  );
}
