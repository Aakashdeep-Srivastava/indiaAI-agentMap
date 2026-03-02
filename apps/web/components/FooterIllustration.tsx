import Image from "next/image";

/* ── Engine-style footer: Giant text + people in front + animated logo ── */
/* People are external SVG/PNG files in /public/people/                    */
/* To upgrade: replace SVGs with real PNG photo cutouts (transparent bg)   */

const PEOPLE: readonly { src: string; alt: string; hideOnMobile?: boolean }[] = [
  { src: "/people/farmer.svg", alt: "Indian farmer with produce", hideOnMobile: true },
  { src: "/people/entrepreneur.svg", alt: "Woman entrepreneur in saree" },
  { src: "/people/shopkeeper.svg", alt: "MSE shopkeeper" },
  // Logo goes here (inserted in JSX)
  { src: "/people/delivery.svg", alt: "Delivery partner" },
  { src: "/people/professional.svg", alt: "Business professional" },
  { src: "/people/artisan.svg", alt: "Indian artisan with handloom", hideOnMobile: true },
];

const ANIM_CLASSES = [
  "footer-float-1",
  "footer-float-2",
  "footer-float-3",
  "footer-float-4",
  "footer-float-5",
  "footer-float-6",
];

export default function FooterIllustration() {
  const left = PEOPLE.slice(0, 3);
  const right = PEOPLE.slice(3);

  return (
    <div className="relative overflow-hidden border-t border-surface-100 bg-gradient-to-b from-white to-surface-50/80">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-0">
        <div className="relative flex items-end justify-center min-h-[220px] sm:min-h-[280px] md:min-h-[360px] lg:min-h-[400px]">
          {/* Giant brand text — behind people */}
          <div
            className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
            aria-hidden="true"
          >
            <span className="font-display text-5xl font-black tracking-tighter text-brand-900/[0.05] sm:text-7xl md:text-8xl lg:text-[10rem] xl:text-[12rem] whitespace-nowrap leading-none">
              AgentMap<span className="text-brand-500/[0.08]">AI</span>
            </span>
          </div>

          {/* People + centered logo */}
          <div className="relative z-10 flex items-end justify-around w-full max-w-6xl mx-auto px-2 sm:px-4">
            {/* Left group */}
            {left.map((person, i) => (
              <div
                key={person.src}
                className={`${ANIM_CLASSES[i]} ${person.hideOnMobile ? "hidden md:block" : ""}`}
              >
                <Image
                  src={person.src}
                  alt={person.alt}
                  width={160}
                  height={380}
                  className="h-36 w-auto sm:h-44 md:h-56 lg:h-64 object-contain"
                  priority={false}
                />
              </div>
            ))}

            {/* CENTER — Animated Logo (big) */}
            <div className="flex flex-col items-center self-center footer-logo-animate px-2 sm:px-6">
              <Image
                src="/logo.png"
                alt="AgentMap AI"
                width={200}
                height={200}
                className="h-24 w-24 sm:h-32 sm:w-32 md:h-44 md:w-44 lg:h-52 lg:w-52 drop-shadow-xl"
                priority
              />
            </div>

            {/* Right group */}
            {right.map((person, i) => (
              <div
                key={person.src}
                className={`${ANIM_CLASSES[i + 3]} ${person.hideOnMobile ? "hidden md:block" : ""}`}
              >
                <Image
                  src={person.src}
                  alt={person.alt}
                  width={160}
                  height={380}
                  className="h-36 w-auto sm:h-44 md:h-56 lg:h-64 object-contain"
                  priority={false}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ground line */}
      <div className="h-px bg-gradient-to-r from-transparent via-surface-300 to-transparent" />
    </div>
  );
}
