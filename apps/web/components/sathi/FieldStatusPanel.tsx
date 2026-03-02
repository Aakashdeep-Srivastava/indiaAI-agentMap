"use client";

import { motion } from "framer-motion";

interface FieldDef {
  key: string;
  label: string;
}

const FIELDS: FieldDef[] = [
  { key: "udyam_number", label: "Udyam No." },
  { key: "mobile_number", label: "Mobile" },
  { key: "name", label: "Business Name" },
  { key: "description", label: "Description" },
  { key: "products", label: "Products" },
  { key: "state", label: "State" },
  { key: "district", label: "District" },
  { key: "pin_code", label: "PIN Code" },
  { key: "language", label: "Language" },
];

interface FieldStatusPanelProps {
  form: Record<string, string>;
  highlighted: Set<string>;
}

export default function FieldStatusPanel({ form, highlighted }: FieldStatusPanelProps) {
  const filled = FIELDS.filter((f) => form[f.key]?.trim()).length;

  return (
    <div className="w-full space-y-3">
      {/* Progress */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
          Fields
        </span>
        <span className="text-[10px] font-mono font-bold text-brand-500">
          {filled}/{FIELDS.length}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {FIELDS.map((f, i) => {
          const value = form[f.key]?.trim();
          const isFilled = !!value;
          const isHighlighted = highlighted.has(f.key);

          const cardClass = isHighlighted
            ? "field-card field-card-highlight"
            : isFilled
              ? "field-card field-card-filled"
              : "field-card field-card-empty";

          return (
            <motion.div
              key={f.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className={cardClass}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[10px] font-semibold uppercase tracking-wider">
                  {f.label}
                </span>
                {isFilled && (
                  <svg
                    className="h-3 w-3 shrink-0 text-emerald-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              {isFilled && (
                <p className="mt-0.5 truncate text-[10px] opacity-80">
                  {value!.length > 20 ? value!.slice(0, 20) + "..." : value}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
