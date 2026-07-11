/**
 * Inline SVG diagrams for blog posts — brand palette, no external assets.
 * Wide diagrams scroll inside their own container on phones (min-width),
 * so body text never shrinks below readable size.
 *
 * Palette: brand-500 #1B4FCC (AI/system), saffron-500 #E8680C (human),
 * green #138808 (outcome), surface-200 #E4E7F1 (borders),
 * brand-900 #0B1437 / surface-600 #4A5170 (ink).
 */

const INK = "#0B1437";
const SUB = "#4A5170";
const MUTED = "#9EA5BE";
const BORDER = "#E4E7F1";
const BLUE = "#1B4FCC";
const SAFFRON = "#E8680C";
const GREEN = "#138808";

function Box({
  x, y, w, h, title, sub, tone = "plain",
}: {
  x: number; y: number; w: number; h: number;
  title: string; sub?: string; tone?: "plain" | "blue" | "saffron" | "green";
}) {
  const fill = tone === "blue" ? BLUE : tone === "saffron" ? SAFFRON : tone === "green" ? GREEN : "#FFFFFF";
  const stroke = tone === "plain" ? BORDER : fill;
  const titleFill = tone === "plain" ? INK : "#FFFFFF";
  const subFill = tone === "plain" ? SUB : "rgba(255,255,255,0.85)";
  const cy = y + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <text x={x + w / 2} y={sub ? cy - 4 : cy + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={titleFill}>
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={cy + 13} textAnchor="middle" fontSize={10} fill={subFill}>
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({ d, id, dashed = false, label, lx, ly }: {
  d: string; id: string; dashed?: boolean; label?: string; lx?: number; ly?: number;
}) {
  return (
    <g>
      <path d={d} fill="none" stroke={MUTED} strokeWidth={1.5}
        strokeDasharray={dashed ? "5 4" : undefined} markerEnd={`url(#${id})`} />
      {label && (
        <text x={lx} y={ly} textAnchor="middle" fontSize={10} fontWeight={600} fill={SUB}>
          {label}
        </text>
      )}
    </g>
  );
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={MUTED} />
      </marker>
    </defs>
  );
}

/* ── 1. Marketplace vs ONDC ─────────────────────────────────── */
function OndcVsMarketplace() {
  return (
    <svg viewBox="0 0 640 290" className="w-full min-w-[560px]" role="img"
      aria-label="Diagram comparing a marketplace, where the seller is locked to one platform, with ONDC, where one listing reaches every buyer app on the open network">
      <Defs id="a-ondc" />
      {/* Left panel — marketplace */}
      <rect x={8} y={8} width={296} height={274} rx={14} fill="#F8F9FC" stroke={BORDER} />
      <text x={156} y={34} textAnchor="middle" fontSize={12} fontWeight={800} fill={INK}>MARKETPLACE</text>
      <text x={156} y={50} textAnchor="middle" fontSize={10} fill={SUB}>the platform owns the customer</text>
      <Box x={86} y={66} w={140} h={44} title="Your shop" sub="one listing" />
      <Arrow id="a-ondc" d="M 156 110 L 156 138" />
      <Box x={66} y={140} w={180} h={44} title="One platform" sub="sets commission & visibility" tone="plain" />
      <Arrow id="a-ondc" d="M 156 184 L 156 212" />
      <Box x={86} y={214} w={140} h={44} title="Its buyers only" sub="leave = start from zero" />
      {/* Right panel — ONDC */}
      <rect x={336} y={8} width={296} height={274} rx={14} fill="#FFFFFF" stroke={BLUE} strokeWidth={1.5} />
      <text x={484} y={34} textAnchor="middle" fontSize={12} fontWeight={800} fill={BLUE}>ONDC — OPEN NETWORK</text>
      <text x={484} y={50} textAnchor="middle" fontSize={10} fill={SUB}>your listing travels the network</text>
      <Box x={414} y={66} w={140} h={44} title="Your shop" sub="one listing" />
      <Arrow id="a-ondc" d="M 484 110 L 484 138" />
      <Box x={404} y={140} w={160} h={44} title="Seller app (SNP)" sub="you choose it" tone="blue" />
      <Arrow id="a-ondc" d="M 444 184 L 396 214" />
      <Arrow id="a-ondc" d="M 484 184 L 484 212" />
      <Arrow id="a-ondc" d="M 524 184 L 572 214" />
      <Box x={346} y={216} w={92} h={40} title="Buyer app" tone="green" />
      <Box x={444} y={216} w={92} h={40} title="Buyer app" tone="green" />
      <Box x={542} y={216} w={84} h={40} title="Buyer app" tone="green" />
    </svg>
  );
}

/* ── 2. VargBot layered classification chain ────────────────── */
function VargbotChain() {
  return (
    <svg viewBox="0 0 640 300" className="w-full min-w-[560px]" role="img"
      aria-label="Diagram of VargBot's layered classification: the trained model answers when confident, otherwise the Sarvam language model, then keyword rules; every result is stamped with its engine and human reviewers stay in charge">
      <Defs id="a-varg" />
      <Box x={20} y={30} w={170} h={48} title="Business description" sub="English · Hinglish · Indic" />
      <Arrow id="a-varg" d="M 190 54 L 230 54" />
      <Box x={232} y={30} w={176} h={48} title="Trained model" sub="TF-IDF · 14 ONDC domains" tone="blue" />
      <Arrow id="a-varg" d="M 408 54 L 470 54" label="confident (≥ gate)" lx={438} ly={44} />
      <Box x={472} y={30} w={148} h={48} title="Domain decided" sub="LLM picks category" tone="green" />
      <Arrow id="a-varg" d="M 320 78 L 320 118" label="unsure" lx={344} ly={102} />
      <Box x={232} y={120} w={176} h={48} title="Sarvam-30B zero-shot" sub="full taxonomy · Indic text" tone="blue" />
      <Arrow id="a-varg" d="M 320 168 L 320 208" label="if LLM unavailable" lx={374} ly={192} />
      <Box x={232} y={210} w={176} h={44} title="Keyword fallback" sub="last resort, stamped" />
      <Arrow id="a-varg" d="M 408 144 L 496 144" />
      <Arrow id="a-varg" d="M 408 232 L 496 210" />
      <Arrow id="a-varg" d="M 546 78 L 546 120" />
      <Box x={472} y={122} w={148} h={44} title="Honest stamp" sub="which engine answered" />
      <Box x={472} y={210} w={148} h={44} title="NSIC review" sub="humans stay in charge" tone="saffron" />
      <text x={20} y={286} fontSize={10} fill={MUTED}>Every result records its engine — no answer ever wears a label it did not earn.</text>
    </svg>
  );
}

/* ── 3. Claims Copilot flow ─────────────────────────────────── */
function ClaimsFlow() {
  return (
    <svg viewBox="0 0 640 210" className="w-full min-w-[560px]" role="img"
      aria-label="Diagram of the Claims Copilot: a TEAM claim passes automated rule checks, receives a risk band, a named NSIC officer decides, and the decision lands in an immutable audit trail">
      <Defs id="a-claim" />
      <Box x={12} y={40} w={108} h={48} title="TEAM claim" sub="from seller app" />
      <Arrow id="a-claim" d="M 120 64 L 148 64" />
      <Box x={150} y={40} w={130} h={48} title="Rule checks" sub="Udyam · caps · dupes" tone="blue" />
      <Arrow id="a-claim" d="M 280 64 L 308 64" />
      <Box x={310} y={40} w={118} h={48} title="Risk band" sub="green · yellow · red" tone="blue" />
      <Arrow id="a-claim" d="M 428 64 L 456 64" />
      <Box x={458} y={40} w={118} h={48} title="Officer decides" sub="named · accountable" tone="saffron" />
      <Arrow id="a-claim" d="M 517 88 L 517 128" />
      <Box x={430} y={130} w={174} h={44} title="Immutable audit trail" sub="every decision recorded" tone="green" />
      <text x={150} y={130} fontSize={10} fill={SUB}>Approval is blocked while any rule fails —</text>
      <text x={150} y={144} fontSize={10} fill={SUB}>the AI checks, humans approve.</text>
    </svg>
  );
}

/* ── 4. MLOps lifecycle loop ────────────────────────────────── */
function MlopsLoop() {
  return (
    <svg viewBox="0 0 640 290" className="w-full min-w-[560px]" role="img"
      aria-label="Diagram of the ML lifecycle loop: data with lineage feeds training, an honest evaluation gates deployment, production is monitored for drift, officer feedback becomes new data, and the loop repeats">
      <Defs id="a-ml" />
      <Box x={24} y={40} w={168} h={52} title="Data with lineage" sub="every row knows its source" />
      <Arrow id="a-ml" d="M 192 66 L 234 66" />
      <Box x={236} y={40} w={168} h={52} title="Train" sub="locked protocol · seeded" tone="blue" />
      <Arrow id="a-ml" d="M 404 66 L 446 66" />
      <Box x={448} y={40} w={168} h={52} title="Honest evaluation" sub="report the worse number" tone="blue" />
      <Arrow id="a-ml" d="M 532 92 L 532 136" label="CI smoke gate" lx={575} ly={118} />
      <Box x={448} y={138} w={168} h={52} title="Deploy" sub="versioned · stamped · rollback" tone="green" />
      <Arrow id="a-ml" d="M 448 164 L 406 164" />
      <Box x={236} y={138} w={168} h={52} title="Monitor drift" sub="Model Health dashboard" tone="blue" />
      <Arrow id="a-ml" d="M 236 164 L 194 164" label="red alert → retrain" lx={216} ly={152} />
      <Box x={24} y={138} w={168} h={52} title="Officer feedback" sub="human decisions exported" tone="saffron" />
      <Arrow id="a-ml" d="M 108 138 L 108 94" label="new training data" lx={108} ly={116} />
      <text x={24} y={240} fontSize={10} fill={MUTED}>The loop — not any single model — is the product. Reproduce it end to end with `dvc repro`.</text>
    </svg>
  );
}

const DIAGRAMS: Record<string, () => React.ReactElement> = {
  "ondc-vs-marketplace": OndcVsMarketplace,
  "vargbot-chain": VargbotChain,
  "claims-flow": ClaimsFlow,
  "mlops-loop": MlopsLoop,
};

export default function BlogDiagram({ id, caption }: { id: string; caption?: string }) {
  const Diagram = DIAGRAMS[id];
  if (!Diagram) return null;
  return (
    <figure className="mt-5 rounded-2xl border border-surface-200 bg-white p-4">
      <div className="overflow-x-auto">
        <Diagram />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-surface-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
