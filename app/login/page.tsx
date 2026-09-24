import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/login-form';
import { getServerSession } from '@/server/auth';

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) redirect('/');

  return <LoginForm />;
}
