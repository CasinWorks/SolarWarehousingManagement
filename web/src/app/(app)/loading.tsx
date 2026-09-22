export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="h-8 w-48 rounded-lg bg-[#e4e0d8]" />
        <div className="flex gap-2">
          <div className="h-12 w-24 rounded-[10px] bg-[#e4e0d8]" />
          <div className="h-12 w-24 rounded-[10px] bg-[#e4e0d8]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24 p-4">
            <div className="mb-3 h-8 w-16 rounded bg-[#eef1f6]" />
            <div className="h-4 w-28 rounded bg-[#eef1f6]" />
          </div>
        ))}
      </div>
      <div className="card h-64" />
    </div>
  );
}
