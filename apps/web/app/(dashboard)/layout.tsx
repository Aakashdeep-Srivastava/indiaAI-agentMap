export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b border-slate-200 pb-3 text-sm">
        <a
          href="/review"
          className="font-medium text-ashoka-500 hover:underline"
        >
          NSIC Review Queue
        </a>
        <a href="/audit" className="text-slate-500 hover:text-navy-800">
          Audit Trail
        </a>
      </nav>
      {children}
    </div>
  );
}
