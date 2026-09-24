'use client';

import { type SyntheticEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, Vault } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { runEmailSignIn } from '@/lib/auth-flow';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    if (!email.trim() || !password) {
      setError('Unable to sign in. Check your email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const signedIn = await runEmailSignIn(
        (credentials) => authClient.signIn.email(credentials),
        {
          email: email.trim(),
          password,
          rememberMe,
        },
      );

      if (!signedIn) {
        setError('Unable to sign in. Check your email and password.');
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('Unable to sign in. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-[100dvh] bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_30rem]">
      <section className="hidden border-r border-border/80 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <Vault className="size-5" aria-hidden="true" />
          </span>
          <span className="font-mono text-sm font-semibold tracking-[0.18em]">
            LIVE.VAULT
          </span>
        </div>
        <div className="max-w-xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Admin operations
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-[-0.045em]">
            Reports ready in under 30 seconds.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            Paste a screenshot, verify the detected data, then save or send the
            active report list.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Private administrative workspace for Live.Vault operations.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <Vault className="size-4.5" aria-hidden="true" />
            </span>
            <span className="font-mono text-sm font-semibold tracking-[0.18em]">
              LIVE.VAULT
            </span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Open the admin workspace to manage report operations.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 pl-9"
                  autoComplete="username"
                  required
                  aria-invalid={Boolean(error)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 pl-9"
                  autoComplete="current-password"
                  required
                  aria-invalid={Boolean(error)}
                />
              </div>
            </div>

            {error ? (
              <p className="text-sm leading-5 text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex w-fit items-center gap-2">
              <Checkbox
                id="remember-session"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
                disabled={loading}
              />
              <Label
                htmlFor="remember-session"
                className="cursor-pointer font-normal text-muted-foreground"
              >
                Remember this session
              </Label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading ? (
                <ArrowRight className="size-4" aria-hidden="true" />
              ) : null}
            </Button>
          </form>

          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            Access is restricted to the configured Live.Vault administrator.
          </p>
        </div>
      </section>
    </main>
  );
}
