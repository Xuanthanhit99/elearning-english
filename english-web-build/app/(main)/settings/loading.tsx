export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-8">
      <div className="h-8 w-72 rounded bg-slate-200" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[250px_1fr]">
        <div className="h-96 rounded-3xl bg-slate-100" />
        <div className="h-[640px] rounded-3xl bg-slate-100" />
      </div>
    </div>
  );
}
