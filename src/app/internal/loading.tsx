export default function InternalLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1520px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-6">
            <div className="h-7 w-14 animate-pulse rounded bg-line" />
            <div className="h-3 w-20 animate-pulse rounded bg-line" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-20 animate-pulse rounded bg-line" />
            <div className="h-4 w-10 animate-pulse rounded bg-line" />
          </div>
        </div>
      </header>
      <nav className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1520px] gap-6 px-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded bg-line" />
          ))}
        </div>
      </nav>
      <main className="mx-auto w-full max-w-[1520px] flex-1 px-5 py-6">
        <div className="h-64 animate-pulse rounded-2xl bg-line" />
      </main>
    </div>
  );
}
