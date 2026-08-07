export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <aside className="hidden h-screen w-64 shrink-0 border-l border-line bg-panel p-4 lg:block">
        <div className="h-12 w-28 animate-pulse rounded-xl bg-line/70" />
        <div className="mt-5 h-20 animate-pulse rounded-2xl bg-line/70" />
        <div className="mt-7 space-y-2">
          <div className="h-11 animate-pulse rounded-xl bg-line/70" />
          <div className="h-11 animate-pulse rounded-xl bg-line/70" />
        </div>
      </aside>
      <div className="flex-1">
        <div className="h-28 border-b border-line bg-panel lg:hidden" />
        <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <div className="h-24 animate-pulse rounded-2xl bg-line/70" />
          <div className="mt-5 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="h-[520px] animate-pulse rounded-2xl bg-line/70" />
            <div className="h-[520px] animate-pulse rounded-2xl bg-line/70" />
          </div>
        </main>
      </div>
    </div>
  );
}
