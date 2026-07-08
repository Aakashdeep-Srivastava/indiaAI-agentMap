"use client";

/* Certificate of ONDC Onboarding Allocation — system-generated once an
 * enterprise is approved and officially allocated to an SNP. Print-ready. */

import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/auth";

interface MSE {
  id: number;
  name: string;
  udyam_number: string;
  entrepreneur_name?: string | null;
  district: string | null;
  state: string | null;
  status?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  assigned_snp_name?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
}

function fmt(d?: string | null) {
  return d
    ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "—";
}

function CertificateInner() {
  const params = useSearchParams();
  const mseId = params.get("mseId");
  const [mse, setMse] = useState<MSE | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mseId) return;
    apiFetch(`/mse/${mseId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setMse)
      .catch(() => setError("Could not load the enterprise record."));
  }, [mseId]);

  if (!mseId) return <p className="py-16 text-center text-sm text-surface-400">No enterprise selected.</p>;
  if (error) return <p className="py-16 text-center text-sm text-red-500">{error}</p>;
  if (!mse) return (
    <div className="flex justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );

  const complete = mse.status === "approved" && !!mse.assigned_snp_name;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Actions (hidden in print) */}
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-surface-500">
          {complete
            ? "Allocation complete — certificate ready."
            : "Certificate becomes available once the enterprise is approved AND officially allocated."}
        </p>
        {complete && (
          <button onClick={() => window.print()} className="btn-primary !px-4 !py-2 !text-xs">
            Download / Print PDF
          </button>
        )}
      </div>

      {!complete ? (
        <div className="glass-card py-14 text-center">
          <p className="text-sm font-medium text-surface-500">
            Status: <b className="capitalize">{(mse.status ?? "").replace("_", " ")}</b>
            {mse.status === "approved" && !mse.assigned_snp_name && " · awaiting official SNP allocation"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border-4 border-double border-brand-900/20 bg-white shadow-lg print:border-2 print:shadow-none">
          {/* Tricolour top */}
          <div className="flex h-2">
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#138808]" />
          </div>

          <div className="px-10 py-8 text-center">
            <div className="flex items-center justify-center gap-3">
              <Image src="/logo.png" alt="MSMEMate" width={46} height={46} />
              <div className="text-left leading-tight">
                <p className="font-display text-lg font-bold text-brand-900">
                  MSME<span className="text-brand-500">Mate</span>
                </p>
                <p className="text-[10px] tracking-wide text-surface-400">
                  Bridging Bharat&apos;s Businesses · TEAM Initiative (PoC)
                </p>
              </div>
            </div>

            <h1 className="mt-6 font-display text-2xl font-extrabold tracking-tight text-brand-900">
              Certificate of ONDC Onboarding Allocation
            </h1>
            <p className="mx-auto mt-1 max-w-md text-[11px] uppercase tracking-widest text-surface-400">
              Trade Enablement &amp; Marketing (TEAM) Initiative
            </p>

            <p className="mx-auto mt-7 max-w-xl text-sm leading-relaxed text-surface-600">
              This is to certify that the Micro/Small Enterprise
            </p>
            <p className="mt-2 font-display text-xl font-bold text-brand-900">{mse.name}</p>
            <p className="mt-1 font-mono text-xs text-surface-500">
              {mse.udyam_number}
              {mse.entrepreneur_name ? ` · Entrepreneur: ${mse.entrepreneur_name}` : ""}
              {mse.district ? ` · ${mse.district}, ${mse.state}` : ""}
            </p>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-surface-600">
              has been verified, approved, and <b>officially allocated</b> to the
              Seller Network Participant
            </p>
            <p className="mt-2 font-display text-lg font-bold text-saffron-600">
              {mse.assigned_snp_name}
            </p>
            <p className="mx-auto mt-1 max-w-xl text-xs text-surface-500">
              for onboarding onto the Open Network for Digital Commerce (ONDC).
            </p>

            <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-6 border-t border-surface-200 pt-6 text-left">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                  Registration Approved
                </p>
                <p className="mt-0.5 text-xs font-semibold text-brand-900">{mse.reviewed_by ?? "—"}</p>
                <p className="text-[11px] text-surface-500">{fmt(mse.reviewed_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                  Officially Allocated
                </p>
                <p className="mt-0.5 text-xs font-semibold text-brand-900">{mse.assigned_by ?? "—"}</p>
                <p className="text-[11px] text-surface-500">{fmt(mse.assigned_at)}</p>
              </div>
            </div>

            <p className="mt-7 font-mono text-[10px] text-surface-400">
              Certificate Ref: MSMEMATE/TEAM/{new Date(mse.assigned_at ?? Date.now()).getFullYear()}/{String(mse.id).padStart(6, "0")}
            </p>
            <p className="mx-auto mt-2 max-w-lg text-[9px] leading-relaxed text-surface-400">
              System-generated record from the MSMEMate platform (IndiaAI Innovation
              Challenge 2026 PoC). Every underlying decision — AI classification,
              officer approval and allocation — is preserved in the tamper-evident
              audit trail.
            </p>
          </div>

          {/* Tricolour bottom */}
          <div className="flex h-2">
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#138808]" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense>
      <CertificateInner />
    </Suspense>
  );
}
