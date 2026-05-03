export default function Loading() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 h-20 animate-pulse rounded-3xl bg-white" />
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <div className="h-[520px] animate-pulse rounded-3xl bg-white" />
          <div>
            <div className="mb-6 h-28 animate-pulse rounded-3xl bg-white" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[430px] animate-pulse rounded-3xl bg-white"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
