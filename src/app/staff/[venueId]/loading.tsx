export default function StaffLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-4">
            <div className="h-7 w-14 animate-pulse rounded bg-line" />
            <div className="h-4 w-20 animate-pulse rounded bg-line" />
            <div className="h-4 w-16 animate-pulse rounded bg-line" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-20 animate-pulse rounded bg-line" />
            <div className="h-4 w-10 animate-pulse rounded bg-line" />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4">
        <div className="h-64 animate-pulse rounded-2xl bg-line" />
      </main>
    </div>
  );
}
