import { requireSession } from '@/server/auth';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireSession();

  return children;
}
