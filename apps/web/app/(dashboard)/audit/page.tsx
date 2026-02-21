"use client";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">Audit Trail</h2>
        <p className="text-sm text-slate-500">
          Immutable log of all classification and matching decisions for
          Responsible AI compliance.
        </p>
      </div>

      <div className="rounded-lg border-2 border-dashed border-slate-200 py-12 text-center text-slate-400">
        Audit trail viewer — connects to the <code>audit_logs</code> table.
        <br />
        <span className="text-xs">
          Full implementation in Phase 2 with pagination and export.
        </span>
      </div>
    </div>
  );
}
