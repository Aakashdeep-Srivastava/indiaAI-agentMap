"use client";

import { useState, useEffect } from "react";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface MSE {
  id: number;
  udyam_number: string;
  name: string;
  description: string;
  state: string | null;
  district: string | null;
}

export default function ReviewPage() {
  const [mses, setMses] = useState<MSE[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/mse/?limit=20`)
      .then((r) => r.json())
      .then(setMses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">
          NSIC Review Queue
        </h2>
        <p className="text-sm text-slate-500">
          Review recently registered MSEs and trigger classification /
          matching.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading MSEs...</div>
      ) : mses.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 py-12 text-center text-slate-400">
          No MSEs registered yet.{" "}
          <a href="/register" className="text-ashoka-500 underline">
            Register one
          </a>
          .
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Udyam No.</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mses.map((mse) => (
                <tr key={mse.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{mse.id}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {mse.udyam_number}
                  </td>
                  <td className="px-4 py-3 font-medium">{mse.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {mse.state ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/?mseId=${mse.id}`}
                      className="rounded bg-ashoka-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-800"
                    >
                      Match
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
