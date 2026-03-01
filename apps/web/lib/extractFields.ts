/**
 * Client-side NER extraction from free-form text.
 * PoC implementation using regex/keyword matching.
 * Production: replace with Sarvam Mayura NER API.
 */

export interface ExtractedFields {
  name?: string;
  udyam_number?: string;
  description?: string;
  state?: string;
  district?: string;
  pin_code?: string;
  products?: string;
  gender_owner?: string;
  turnover_band?: string;
  language?: string;
}

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

  // --- Udyam registration number ---
  const udyamMatch = text.match(/UDYAM[-\s]?[A-Z]{2}[-\s]?\d{2}[-\s]?\d{7}/i);
  if (udyamMatch) {
    result.udyam_number = udyamMatch[0].toUpperCase().replace(/\s/g, "-");
  }

  // --- Business name ---
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

  // --- State ---
  for (const state of INDIAN_STATES) {
    if (lower.includes(state.toLowerCase())) {
      result.state = state;
      break;
    }
  }
  // Abbreviation fallbacks
  if (!result.state) {
    if (/\bU\.?P\.?\b/i.test(text)) result.state = "Uttar Pradesh";
    else if (/\bM\.?P\.?\b/i.test(text)) result.state = "Madhya Pradesh";
    else if (/\bA\.?P\.?\b/i.test(text)) result.state = "Andhra Pradesh";
    else if (/\bH\.?P\.?\b/i.test(text)) result.state = "Himachal Pradesh";
  }

  // --- District / City ---
  for (const [key, display] of Object.entries(KNOWN_DISTRICTS)) {
    if (lower.includes(key)) {
      result.district = display;
      break;
    }
  }

  // --- PIN code (6-digit Indian postal code) ---
  const pinMatch = text.match(/\b([1-9]\d{5})\b/);
  if (pinMatch) result.pin_code = pinMatch[1];

  // --- Products / Services ---
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

  // --- Description (use the whole text as description if long enough) ---
  if (text.length > 30) {
    result.description = text.trim();
  }

  // --- Gender ---
  if (/\b(female|woman|lady|mahila|she\b|her\b|wife)/i.test(text)) {
    result.gender_owner = "female";
  } else if (/\b(male|man\b|he\b|his\b|husband)/i.test(text)) {
    result.gender_owner = "male";
  }

  // --- Enterprise size ---
  if (/\bmicro\b/i.test(text)) result.turnover_band = "micro";
  else if (/\bsmall\b/i.test(text)) result.turnover_band = "small";
  else if (/\bmedium\b/i.test(text)) result.turnover_band = "medium";

  return result;
}

/** Count how many registration fields have values */
export function countFilledFields(form: Record<string, string>): number {
  const required = [
    "name", "udyam_number", "description", "state",
    "district", "pin_code", "products", "language",
  ];
  return required.filter((k) => form[k]?.trim()).length;
}

/** Get list of missing required fields */
export function getMissingFields(form: Record<string, string>): string[] {
  const labels: Record<string, string> = {
    name: "business name",
    udyam_number: "Udyam number",
    description: "business description",
    state: "state",
    district: "district",
    pin_code: "PIN code",
    products: "products or services",
    language: "preferred language",
  };
  return Object.entries(labels)
    .filter(([k]) => !form[k]?.trim())
    .map(([, v]) => v);
}
