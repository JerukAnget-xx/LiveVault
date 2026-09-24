'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { runSignOut } from '@/lib/auth-flow';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const signedOut = await runSignOut(() => authClient.signOut());
      if (!signedOut) return;

      router.replace('/login');
      router.refresh();
    } catch {
      // Fail closed: keep the user on the protected page if sign-out fails.
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Log out"
      title="Log out"
      disabled={loading}
      onClick={logout}
    >
      <LogOut className="size-4" aria-hidden="true" />
    </Button>
  );
}
