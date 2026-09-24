import { Skeleton } from '@/components/ui/skeleton';

export default function ProtectedPageLoading() {
  return (
    <main
      className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16"
      aria-busy="true"
      aria-label="Loading Live.Vault data"
    >
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-5 h-10 w-72 max-w-full" />
      <Skeleton className="mt-4 h-5 w-[32rem] max-w-full" />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </main>
  );
}
