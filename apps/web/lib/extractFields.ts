/**
 * Field extraction utilities for Sathi registration.
 *
 * Primary: calls /ner/extract API (Sarvam-m LLM — multilingual)
 * Fallback: client-side regex for instant offline extraction
 */

export interface ExtractedFields {
  name?: string;
  udyam_number?: string;
  mobile_number?: string;
  description?: string;
  state?: string;
  district?: string;
  pin_code?: string;
  products?: string;
  turnover_band?: string;
  language?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ── API-based extraction (Sarvam-m LLM) ─────────────────────────── */

export async function extractFieldsFromAPI(
  text: string,
  existingFields: Record<string, string> = {},
): Promise<{ fields: ExtractedFields; engine: string }> {
  try {
    const res = await fetch(`${API}/ner/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        language: "auto",
        existing_fields: existingFields,
      }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    return { fields: data.extracted, engine: data.engine };
  } catch {
    // Fallback to client-side regex
    const fields = extractFieldsFromText(text);
    // Remove already-filled fields
    for (const key of Object.keys(existingFields)) {
      if (existingFields[key]) delete (fields as Record<string, string | undefined>)[key];
    }
    return { fields, engine: "regex-fallback" };
  }
}

/* ── Language detection ───────────────────────────────────────────── */

export function detectLanguage(text: string): "en" | "hi" {
  const devanagariChars = text.match(/[\u0900-\u097F]/g);
  return devanagariChars && devanagariChars.length >= 2 ? "hi" : "en";
}

/* ── Client-side regex extraction (fast fallback) ─────────────────── */

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

const KNOWN_DISTRICTS: Record<string, string> = {
  varanasi: "Varanasi", lucknow: "Lucknow", jaipur: "Jaipur",
  mumbai: "Mumbai", pune: "Pune", chennai: "Chennai", bangalore: "Bangalore",
  bengaluru: "Bengaluru", hyderabad: "Hyderabad", kolkata: "Kolkata",
  ahmedabad: "Ahmedabad", surat: "Surat", indore: "Indore",
  bhopal: "Bhopal", nagpur: "Nagpur", kanpur: "Kanpur", agra: "Agra",
  patna: "Patna", coimbatore: "Coimbatore", madurai: "Madurai",
  mysore: "Mysore", mysuru: "Mysuru", noida: "Noida", gurgaon: "Gurgaon",
  gurugram: "Gurugram", faridabad: "Faridabad", chandigarh: "Chandigarh",
  ranchi: "Ranchi", dehradun: "Dehradun", jodhpur: "Jodhpur",
  udaipur: "Udaipur", kochi: "Kochi", thiruvananthapuram: "Thiruvananthapuram",
  visakhapatnam: "Visakhapatnam", vijayawada: "Vijayawada",
  tirupati: "Tirupati", rajkot: "Rajkot", vadodara: "Vadodara",
  nashik: "Nashik", aurangabad: "Aurangabad", thane: "Thane",
  ludhiana: "Ludhiana", amritsar: "Amritsar", guwahati: "Guwahati",
  bhubaneswar: "Bhubaneswar", raipur: "Raipur",
};

export function extractFieldsFromText(text: string): ExtractedFields {
  const result: ExtractedFields = {};
  const lower = text.toLowerCase();

  // Udyam number
  const udyamMatch = text.match(/UDYAM[-\s]?[A-Z]{2}[-\s]?\d{2}[-\s]?\d{7}/i);
  if (udyamMatch) {
    result.udyam_number = udyamMatch[0].toUpperCase().replace(/\s/g, "-");
  }

  // Mobile number
  const mobileMatch = text.match(/\b([6-9]\d{9})\b/);
  if (mobileMatch) result.mobile_number = mobileMatch[1];

  // Business name
  const namePatterns = [
    /(?:business|company|shop|enterprise|firm|brand|store)\s+(?:name\s+)?(?:is|called|named)\s+["']?([A-Z][^"',.;\n]{2,40})/i,
    /(?:called|named)\s+["']?([A-Z][^"',.;\n]{2,40})/i,
    /(?:i\s+(?:run|own|have|started|operate))\s+(?:a\s+)?(?:\w+\s+)?(?:called|named)\s+["']?([A-Z][^"',.;\n]{2,40})/i,
    /(?:my|our)\s+(?:business|company|shop|firm|store)\s+["']?([A-Z][^"',.;\n]{2,40})/i,
  ];
  for (const p of namePatterns) {
    const m = text.match(p);
    if (m) {
      result.name = m[1].trim().replace(/[.!?]+$/, "");
      break;
    }
  }

  // State
  for (const state of INDIAN_STATES) {
    if (lower.includes(state.toLowerCase())) {
      result.state = state;
      break;
    }
  }
  if (!result.state) {
    if (/\bU\.?P\.?\b/i.test(text)) result.state = "Uttar Pradesh";
    else if (/\bM\.?P\.?\b/i.test(text)) result.state = "Madhya Pradesh";
    else if (/\bA\.?P\.?\b/i.test(text)) result.state = "Andhra Pradesh";
    else if (/\bH\.?P\.?\b/i.test(text)) result.state = "Himachal Pradesh";
  }

  // District
  for (const [key, display] of Object.entries(KNOWN_DISTRICTS)) {
    if (lower.includes(key)) {
      result.district = display;
      break;
    }
  }

  // PIN code
  const pinMatch = text.match(/\b([1-9]\d{5})\b/);
  if (pinMatch) result.pin_code = pinMatch[1];

  // Products
  const prodPatterns = [
    /(?:we\s+(?:make|sell|produce|manufacture|deal\s+in|supply|create|offer))\s+([^.!?\n]{5,120})/i,
    /(?:products?|services?|items?)\s+(?:are|include|like)\s+([^.!?\n]{5,120})/i,
    /(?:dealing\s+in|speciali[sz]e\s+in|work\s+(?:in|with))\s+([^.!?\n]{5,120})/i,
  ];
  for (const p of prodPatterns) {
    const m = text.match(p);
    if (m) {
      result.products = m[1].trim().replace(/[.!?]+$/, "");
      break;
    }
  }

  // Description
  if (text.length > 30) result.description = text.trim();

  // Enterprise size
  if (/\bmicro\b/i.test(text)) result.turnover_band = "micro";
  else if (/\bsmall\b/i.test(text)) result.turnover_band = "small";
  else if (/\bmedium\b/i.test(text)) result.turnover_band = "medium";

  return result;
}

/* ── Utility functions ────────────────────────────────────────────── */

export function countFilledFields(form: Record<string, string>): number {
  const required = [
    "name", "udyam_number", "mobile_number", "description", "state",
    "district", "pin_code", "products",
  ];
  return required.filter((k) => form[k]?.trim()).length;
}

export function getMissingFields(form: Record<string, string>): string[] {
  const labels: Record<string, string> = {
    name: "business name",
    udyam_number: "Udyam number",
    mobile_number: "mobile number",
    description: "business description",
    state: "state",
    district: "district",
    pin_code: "PIN code",
    products: "products or services",
  };
  return Object.entries(labels)
    .filter(([k]) => !form[k]?.trim())
    .map(([, v]) => v);
}
