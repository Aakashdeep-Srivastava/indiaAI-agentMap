"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VoiceInput from "@/components/VoiceInput";
import {
  extractFieldsFromText,
  getMissingFields,
  type ExtractedFields,
} from "@/lib/extractFields";

/* ─── Types ─── */
type MessageKind = "text" | "extraction" | "upload" | "summary";

interface Message {
  id: string;
  role: "bot" | "user";
  text: string;
  kind: MessageKind;
  extractedFields?: Record<string, string>;
  quickReplies?: { label: string; value: string }[];
}

interface FormState {
  udyam_number: string;
  name: string;
  description: string;
  state: string;
  district: string;
  pin_code: string;
  nic_code: string;
  language: string;
  gender_owner: string;
  turnover_band: string;
  products: string;
}

type AgentPhase =
  | "greeting"
  | "listening"
  | "extracting"
  | "followup"
  | "documents"
  | "confirming"
  | "complete";

interface SathiAgentProps {
  form: FormState;
  onUpdate: (field: string, value: string) => void;
  onHighlight: (fields: string[]) => void;
  onSubmit: () => void;
  onStepChange: (step: number) => void;
  submitting: boolean;
  success: number | null;
}

/* ─── Labels ─── */
const FIELD_LABELS: Record<string, string> = {
  name: "Business Name",
  udyam_number: "Udyam Number",
  language: "Language",
  description: "Description",
  products: "Products",
  gender_owner: "Owner Gender",
  turnover_band: "Enterprise Size",
  state: "State",
  district: "District",
  pin_code: "PIN Code",
};

const LANG_LABELS: Record<string, string> = {
  en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu",
  kn: "Kannada", bn: "Bengali", mr: "Marathi", gu: "Gujarati",
};

let msgCounter = 0;
function mid() { return `m-${++msgCounter}`; }

export default function SathiAgent({
  form,
  onUpdate,
  onHighlight,
  onSubmit,
  onStepChange,
  submitting,
  success,
}: SathiAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<AgentPhase>("greeting");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [followupField, setFollowupField] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);

  const scroll = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, []);

  /* ─── Add messages ─── */
  const addBot = useCallback(
    (text: string, opts?: Partial<Omit<Message, "id" | "role">>) => {
      setTyping(true);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setTyping(false);
          setMessages((prev) => [
            ...prev,
            { id: mid(), role: "bot", text, kind: "text", ...opts },
          ]);
          scroll();
          resolve();
        }, 700);
      });
    },
    [scroll],
  );

  const addUser = useCallback(
    (text: string) => {
      setMessages((prev) => [
        ...prev,
        { id: mid(), role: "user", text, kind: "text" },
      ]);
      scroll();
    },
    [scroll],
  );

  /* ─── Greeting ─── */
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      await addBot(
        "Namaste! I'm Sathi, your AI registration guide. Just tell me about your business — speak naturally or type below. I'll fill in the form for you!",
      );
      await addBot(
        "For example: \"I'm Sunita from Varanasi, UP. I run a small handicraft shop called Devi Creations. We make wooden toys. My Udyam number is UDYAM-UP-04-0012345.\"",
      );
      setPhase("listening");
    })();
  }, [addBot]);

  /* Scroll on change */
  useEffect(() => { scroll(); }, [messages, typing, scroll]);

  /* Sync form step */
  useEffect(() => {
    const hasIdentity = form.name || form.udyam_number;
    onStepChange(hasIdentity ? 1 : 0);
  }, [form.name, form.udyam_number, onStepChange]);

  /* ─── Auto-advance after success ─── */
  useEffect(() => {
    if (success !== null && phase !== "complete") {
      setPhase("complete");
      addBot(
        `Registration successful! Your MSE ID is ${success}. Moving you to the classification step...`,
      );
    }
  }, [success, phase, addBot]);

  /* ─── Core: extract entities from user input ─── */
  async function handleExtraction(text: string) {
    addUser(text);
    setPhase("extracting");
    setTyping(true);

    // Simulate AI processing time
    await new Promise((r) => setTimeout(r, 1200));
    setTyping(false);

    const extracted = extractFieldsFromText(text);
    const filledKeys: string[] = [];

    // Apply extracted fields to form
    for (const [key, value] of Object.entries(extracted)) {
      if (value && !form[key as keyof FormState]) {
        onUpdate(key, value);
        filledKeys.push(key);
      }
    }

    // Highlight the filled fields on the form
    if (filledKeys.length > 0) {
      onHighlight(filledKeys);
    }

    if (filledKeys.length > 0) {
      // Show extraction card
      const fieldMap: Record<string, string> = {};
      for (const k of filledKeys) {
        const raw = extracted[k as keyof ExtractedFields] || "";
        fieldMap[FIELD_LABELS[k] || k] = raw;
      }

      await addBot("I picked up some details! Let me fill those in for you...", {
        kind: "extraction",
        extractedFields: fieldMap,
      });

      // Check what's still missing
      const mergedForm = { ...form };
      for (const [k, v] of Object.entries(extracted)) {
        if (v) mergedForm[k as keyof FormState] = v;
      }
      const missing = getMissingFields(mergedForm);

      if (missing.length === 0) {
        setPhase("documents");
        await addBot(
          "All the required details are filled in! Could you upload your Udyam registration certificate for verification? You can also skip this step.",
          { kind: "upload" },
        );
      } else if (missing.length <= 3) {
        setPhase("followup");
        const first = missing[0];
        setFollowupField(fieldToKey(first));
        const qr = getQuickReplies(fieldToKey(first));
        await addBot(
          `Almost there! I still need your ${missing.join(", ")}. What's your ${first}?`,
          qr ?? undefined,
        );
      } else {
        setPhase("followup");
        const first = missing[0];
        setFollowupField(fieldToKey(first));
        const qr = getQuickReplies(fieldToKey(first));
        await addBot(
          `Great start! I still need a few more details. Let's go through them. What's your ${first}?`,
          qr ?? undefined,
        );
      }
    } else {
      // Nothing extracted — treat as direct answer for current followup field
      if (followupField) {
        handleDirectAnswer(text);
        return;
      }
      await addBot(
        "I couldn't quite catch the details from that. Could you try again? Mention your business name, location, products, and Udyam number.",
      );
      setPhase("listening");
    }
  }

  /* ─── Handle direct answer to a followup question ─── */
  function handleDirectAnswer(text: string) {
    if (!followupField) return;
    addUser(text);

    onUpdate(followupField, text);
    onHighlight([followupField]);

    const label = FIELD_LABELS[followupField] || followupField;

    const mergedForm = { ...form, [followupField]: text };
    const missing = getMissingFields(mergedForm);

    if (missing.length === 0) {
      setPhase("documents");
      setFollowupField(null);
      addBot(`Got it! ${label} set to: ${text}`).then(() =>
        addBot(
          "All details filled! Would you like to upload your Udyam certificate for verification? You can also skip.",
          { kind: "upload" },
        ),
      );
    } else {
      const next = missing[0];
      const nextKey = fieldToKey(next);
      setFollowupField(nextKey);
      const qr = getQuickReplies(nextKey);
      addBot(`Got it! ${label} set to: ${text}`).then(() =>
        addBot(`What's your ${next}?`, qr ?? undefined),
      );
    }
  }

  /* ─── Quick reply handler ─── */
  function handleQuickReply(value: string, label: string) {
    if (!followupField) return;
    addUser(label);

    onUpdate(followupField, value);
    onHighlight([followupField]);

    const fieldLabel = FIELD_LABELS[followupField] || followupField;
    const mergedForm = { ...form, [followupField]: value };
    const missing = getMissingFields(mergedForm);

    if (missing.length === 0) {
      setPhase("documents");
      setFollowupField(null);
      addBot(`Got it! ${fieldLabel} set to: ${label}`).then(() =>
        addBot(
          "Wonderful! All details are in. Would you like to upload your Udyam certificate for verification?",
          { kind: "upload" },
        ),
      );
    } else {
      const next = missing[0];
      const nextKey = fieldToKey(next);
      setFollowupField(nextKey);
      const qr = getQuickReplies(nextKey);
      addBot(`Got it! ${fieldLabel} set to: ${label}`).then(() =>
        addBot(`What's your ${next}?`, qr ?? undefined),
      );
    }
  }

  /* ─── Document upload ─── */
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    addUser(`Uploaded: ${file.name}`);
    setVerifying(true);

    // Mock Sarvam Vision OCR validation
    setTimeout(async () => {
      setVerifying(false);
      await addBot(
        `Certificate "${file.name}" verified successfully! Your details match the document.`,
      );
      moveToConfirm();
    }, 2500);
  }

  function skipUpload() {
    addUser("Skip certificate upload");
    moveToConfirm();
  }

  async function moveToConfirm() {
    setPhase("confirming");
    const lines = [
      `Business Name: ${form.name || "—"}`,
      `Udyam: ${form.udyam_number || "—"}`,
      `Language: ${LANG_LABELS[form.language] || form.language || "—"}`,
      `Description: ${(form.description || "—").slice(0, 80)}${form.description?.length > 80 ? "..." : ""}`,
      `Products: ${form.products || "—"}`,
      `State: ${form.state || "—"}, District: ${form.district || "—"}`,
      `PIN: ${form.pin_code || "—"}`,
    ];
    await addBot(
      `Here's your registration summary:\n\n${lines.join("\n")}\n\nReady to submit?`,
      { kind: "summary" },
    );
  }

  /* ─── Send handler ─── */
  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");

    if (phase === "listening" || phase === "extracting") {
      handleExtraction(trimmed);
    } else if (phase === "followup" && followupField) {
      handleDirectAnswer(trimmed);
    } else if (phase === "documents") {
      // User typed something instead of uploading — skip
      skipUpload();
    }
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleVoiceTranscribe(text: string) {
    if (phase === "listening" || phase === "extracting") {
      handleExtraction(text);
    } else if (phase === "followup" && followupField) {
      // Try extraction first — if the user gives a long answer with multiple fields
      const extracted = extractFieldsFromText(text);
      const keys = Object.keys(extracted).filter(
        (k) => extracted[k as keyof ExtractedFields] && !form[k as keyof FormState],
      );
      if (keys.length > 1) {
        handleExtraction(text);
      } else {
        handleDirectAnswer(text);
      }
    }
  }

  const isInputDisabled = phase === "confirming" || phase === "complete" || submitting;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-card">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 bg-brand-900 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-saffron-400 to-saffron-500">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-display text-sm font-bold text-white">Sathi</h3>
          <p className="text-[11px] text-white/60">
            {phase === "extracting"
              ? "Analyzing your response..."
              : phase === "complete"
                ? "Registration complete!"
                : "AI Registration Assistant"}
          </p>
        </div>
        {/* Progress indicator */}
        <div className="flex items-center gap-1.5">
          {(["greeting", "listening", "followup", "documents", "confirming", "complete"] as AgentPhase[]).map(
            (p, i) => (
              <div
                key={p}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  getPhaseIndex(phase) >= i
                    ? "bg-saffron-400"
                    : "bg-white/20"
                }`}
              />
            ),
          )}
        </div>
      </div>

      {/* ─── Chat area ─── */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sathi-chat-scroll">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "bot" && (
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50">
                  <svg className="h-3.5 w-3.5 text-brand-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  </svg>
                </div>
              )}
              <div className="max-w-[80%]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-brand-500 text-white"
                      : "bg-brand-50 text-brand-900"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Extraction card */}
                {msg.kind === "extraction" && msg.extractedFields && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ delay: 0.3 }}
                    className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3"
                  >
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                      Fields Detected
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(msg.extractedFields).map(([label, val]) => (
                        <div key={label} className="flex items-center gap-2 text-xs">
                          <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span className="font-medium text-surface-600">{label}:</span>
                          <span className="truncate text-brand-900">{val}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Quick replies */}
        {messages.length > 0 &&
          messages[messages.length - 1].role === "bot" &&
          messages[messages.length - 1].quickReplies && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 pl-9"
            >
              {messages[messages.length - 1].quickReplies!.map((qr) => (
                <button
                  key={qr.value}
                  onClick={() => handleQuickReply(qr.value, qr.label)}
                  className="rounded-full border border-brand-500/20 bg-white px-3.5 py-1.5 text-xs font-medium text-brand-500 transition-all hover:bg-brand-500 hover:text-white active:scale-95"
                >
                  {qr.label}
                </button>
              ))}
            </motion.div>
          )}

        {/* Upload zone */}
        {phase === "documents" && !uploadedFile && !verifying && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-9 flex flex-col gap-2"
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 rounded-xl border-2 border-dashed border-brand-500/20 bg-brand-50/50 px-4 py-4 text-sm text-brand-500 transition-all hover:border-brand-500/40 hover:bg-brand-50"
            >
              <svg className="h-8 w-8 shrink-0 text-brand-500/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="text-left">
                <p className="font-medium">Upload Certificate</p>
                <p className="text-[11px] text-surface-400">Udyam / GST / PAN (Image or PDF)</p>
              </div>
            </button>
            <button
              onClick={skipUpload}
              className="text-xs text-surface-400 hover:text-surface-600 transition-colors"
            >
              Skip for now
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </motion.div>
        )}

        {/* Verifying animation */}
        {verifying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-9 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-500"
          >
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Verifying certificate with Sarvam Vision...
          </motion.div>
        )}

        {/* Typing indicator */}
        {typing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 pl-9"
          >
            <div className="flex items-center gap-1.5 rounded-2xl bg-brand-50 px-4 py-3">
              <span className="typing-dot" />
              <span className="typing-dot typing-dot-2" />
              <span className="typing-dot typing-dot-3" />
            </div>
          </motion.div>
        )}

        {/* Submit button */}
        {phase === "confirming" && !submitting && success === null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-3 pt-2"
          >
            <button onClick={onSubmit} className="btn-saffron">
              Submit Registration
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </motion.div>
        )}

        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center pt-2"
          >
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-5 py-3 text-sm text-brand-500">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Registering your business...
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ─── Input area ─── */}
      <div className="border-t border-surface-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <VoiceInput
            language={form.language}
            fieldLabel="Business Details"
            onTranscribe={handleVoiceTranscribe}
            disabled={isInputDisabled}
          />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isInputDisabled
                ? success !== null
                  ? "Registration complete!"
                  : "Click Submit above"
                : phase === "listening"
                  ? "Tell me about your business..."
                  : "Type your answer..."
            }
            disabled={isInputDisabled}
            className="input-field flex-1 !py-2.5"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isInputDisabled}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition-all hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function getPhaseIndex(phase: AgentPhase): number {
  const order: AgentPhase[] = [
    "greeting", "listening", "followup", "documents", "confirming", "complete",
  ];
  const idx = order.indexOf(phase);
  return idx >= 0 ? idx : 0;
}

function fieldToKey(label: string): string {
  const map: Record<string, string> = {
    "business name": "name",
    "udyam number": "udyam_number",
    "business description": "description",
    state: "state",
    district: "district",
    "pin code": "pin_code",
    "products or services": "products",
    "preferred language": "language",
    "owner gender": "gender_owner",
    "enterprise size": "turnover_band",
  };
  return map[label] || label;
}

function getQuickReplies(
  field: string,
): { quickReplies: { label: string; value: string }[] } | null {
  switch (field) {
    case "language":
      return {
        quickReplies: [
          { label: "English", value: "en" },
          { label: "Hindi", value: "hi" },
          { label: "Tamil", value: "ta" },
          { label: "Telugu", value: "te" },
          { label: "Kannada", value: "kn" },
          { label: "Bengali", value: "bn" },
          { label: "Marathi", value: "mr" },
          { label: "Gujarati", value: "gu" },
        ],
      };
    case "gender_owner":
      return {
        quickReplies: [
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
          { label: "Other", value: "other" },
        ],
      };
    case "turnover_band":
      return {
        quickReplies: [
          { label: "Micro", value: "micro" },
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
        ],
      };
    case "state":
      return {
        quickReplies: [
          { label: "Maharashtra", value: "Maharashtra" },
          { label: "Uttar Pradesh", value: "Uttar Pradesh" },
          { label: "Karnataka", value: "Karnataka" },
          { label: "Tamil Nadu", value: "Tamil Nadu" },
          { label: "Gujarat", value: "Gujarat" },
          { label: "Delhi", value: "Delhi" },
          { label: "Rajasthan", value: "Rajasthan" },
          { label: "West Bengal", value: "West Bengal" },
        ],
      };
    default:
      return null;
  }
}
