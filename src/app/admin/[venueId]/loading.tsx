export default function AdminLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-6">
            <div className="h-7 w-14 animate-pulse rounded bg-line" />
            <div className="h-4 w-24 animate-pulse rounded bg-line" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-20 animate-pulse rounded bg-line" />
            <div className="h-4 w-10 animate-pulse rounded bg-line" />
          </div>
        </div>
      </header>
      <nav className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl gap-4 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-16 animate-pulse rounded bg-line" />
          ))}
        </div>
      </nav>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">
        <div className="space-y-4">
          <div className="h-12 w-full animate-pulse rounded-2xl bg-line" />
          <div className="grid gap-4 xl:grid-cols-[240px_1fr]">
            <div className="h-96 animate-pulse rounded-2xl bg-line" />
            <div className="h-96 animate-pulse rounded-2xl bg-line" />
          </div>
        </div>
      </main>
    </div>
  );
}
