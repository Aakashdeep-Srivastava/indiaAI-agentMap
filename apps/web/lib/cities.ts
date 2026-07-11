/**
 * Local SEO — India's MSME cluster cities.
 *
 * Every entry describes a real, well-documented manufacturing/craft cluster
 * (many GI-tagged). The copy must stay factual: these pages rank because
 * they are genuinely useful to a business owner in that city, not because
 * they are doorway pages.
 */

export interface CityCluster {
  slug: string;
  city: string;
  state: string;
  /** Famous cluster name, e.g. "Pital Nagri (Brass City)" */
  knownAs?: string;
  /** Headline craft/industry */
  industry: string;
  /** What local MSMEs make — used as chips + keywords */
  products: string[];
  /** ONDC domains those products map to */
  ondcFit: string[];
  /** Unique local intro — 2-3 factual sentences */
  intro: string;
  /** One cluster-specific FAQ */
  faq: { q: string; a: string };
}

export const CITY_CLUSTERS: CityCluster[] = [
  {
    slug: "moradabad",
    city: "Moradabad",
    state: "Uttar Pradesh",
    knownAs: "Pital Nagri — the Brass City",
    industry: "Brass and metal handicrafts",
    products: ["Brass diyas", "Pooja thalis", "Urlis", "Decorative figurines", "Metal lamps", "EPNS ware"],
    ondcFit: ["Home & Kitchen", "Handicrafts"],
    intro:
      "Moradabad's metal craft carries a Geographical Indication (GI) tag, and its brass workshops — many of them three-generation family units — supply temples, home-décor retailers and exporters across India and abroad. Most of these workshops still sell through middlemen; ONDC lets them reach buyers on every connected app directly.",
    faq: {
      q: "Can a small brass workshop in Moradabad sell on ONDC without a website?",
      a: "Yes. You need no website of your own — a seller app hosts your catalogue on the network. MSMEMate registers you by voice in Hindi, reads your Udyam certificate from a photo, classifies brass handicrafts into the right ONDC category and recommends seller apps active in Uttar Pradesh.",
    },
  },
  {
    slug: "varanasi",
    city: "Varanasi",
    state: "Uttar Pradesh",
    knownAs: "home of the Banarasi saree",
    industry: "Banarasi silk weaving",
    products: ["Banarasi silk sarees", "Brocade fabrics", "Zari work", "Wooden lacquerware toys", "Stone inlay"],
    ondcFit: ["Fashion", "Handicrafts"],
    intro:
      "The Banarasi saree holds a GI tag, and Varanasi's weaving households form one of India's oldest textile clusters. Alongside silk, the city's GI-tagged wooden lacquerware toy craft and stone inlay work give its MSEs a catalogue that buyers across India actively search for.",
    faq: {
      q: "I weave Banarasi sarees at home. Is my business too small for ONDC?",
      a: "No — ONDC was designed so a single-loom household can reach the same buyers as a large brand. With a free Udyam registration and a spoken description of your sarees, MSMEMate classifies your products and matches you to seller apps that support small fashion sellers in Hindi.",
    },
  },
  {
    slug: "ludhiana",
    city: "Ludhiana",
    state: "Punjab",
    knownAs: "the Manchester of India",
    industry: "Hosiery and knitwear",
    products: ["Woollen sweaters", "T-shirts", "Knitwear", "Cycle parts", "Sewing machine parts"],
    ondcFit: ["Fashion"],
    intro:
      "Ludhiana produces the bulk of India's woollen knitwear and hosiery, alongside a machine-parts ecosystem that supplies cycle and sewing-machine manufacturers nationally. Thousands of its small units sell only to wholesale buyers today — ONDC opens the direct-to-customer channel without a marketplace lock-in.",
    faq: {
      q: "My Ludhiana hosiery unit sells wholesale. Does B2C on ONDC make sense?",
      a: "Many hosiery units run both: wholesale for volume, ONDC for margin. During registration MSMEMate records whether you want B2B, B2C or both, and JodakAI weighs that when ranking seller apps for you.",
    },
  },
  {
    slug: "tirupur",
    city: "Tirupur",
    state: "Tamil Nadu",
    knownAs: "India's knitwear capital",
    industry: "Knitwear and garments",
    products: ["T-shirts", "Innerwear", "Kidswear", "Casual wear", "Cotton garments"],
    ondcFit: ["Fashion"],
    intro:
      "Tirupur accounts for a major share of India's knitwear exports, with thousands of small stitching, dyeing and finishing units in its ecosystem. Units that today depend on export orders can use ONDC to build a domestic retail channel under their own brand name.",
    faq: {
      q: "Can MSMEMate work in Tamil?",
      a: "Yes. You can speak your business description in Tamil — the AI understands it, classifies your garments into ONDC's fashion taxonomy, and shows explanations you can read in simple language. Seller apps with Tamil support rank higher in your matches.",
    },
  },
  {
    slug: "agra",
    city: "Agra",
    state: "Uttar Pradesh",
    industry: "Leather footwear",
    products: ["Leather shoes", "Sandals", "Juttis", "Marble inlay handicrafts", "Agra petha"],
    ondcFit: ["Fashion", "Grocery", "Handicrafts"],
    intro:
      "Agra's footwear cluster is one of the largest in Asia — a significant share of India's domestic shoe production comes from its small workshops. Add GI-tagged marble inlay craft and the famous petha sweets, and Agra's MSEs span three ONDC domains at once.",
    faq: {
      q: "I make shoes and also sell petha. Can one MSMEMate profile handle both?",
      a: "Yes. VargBot classifies multi-product businesses across categories — your footwear maps to Fashion and petha to Grocery — and your product list (even a simple Excel) can be imported so every item lands in its right ONDC category.",
    },
  },
  {
    slug: "jaipur",
    city: "Jaipur",
    state: "Rajasthan",
    knownAs: "the Pink City",
    industry: "Gems, jewellery and handicrafts",
    products: ["Gemstone jewellery", "Blue pottery", "Block-printed textiles", "Quilts (razai)", "Mojari footwear"],
    ondcFit: ["Fashion", "Home & Kitchen", "Handicrafts"],
    intro:
      "Jaipur's artisan economy runs from GI-tagged blue pottery to one of the world's biggest coloured-gemstone cutting hubs, plus Sanganeri block printing recognised with its own GI. Its craft MSEs are exactly the sellers ONDC's buyer apps want in their handicraft and fashion catalogues.",
    faq: {
      q: "Do jewellery sellers face extra checks on ONDC?",
      a: "High-value categories can carry stricter seller-app KYC — typically GST and hallmarking details for precious jewellery. MSMEMate flags such compliance items on your classification result so you know before you apply.",
    },
  },
  {
    slug: "surat",
    city: "Surat",
    state: "Gujarat",
    knownAs: "the Silk City",
    industry: "Synthetic textiles and sarees",
    products: ["Polyester sarees", "Dress materials", "Embroidered fabrics", "Diamond polishing"],
    ondcFit: ["Fashion"],
    intro:
      "Surat weaves a dominant share of India's man-made fabric and processes most of the world's diamonds by volume. Its textile traders already understand catalogue selling — ONDC gives the city's smaller weaving and embroidery units the same digital shelf without marketplace commissions set by one gatekeeper.",
    faq: {
      q: "I trade sarees in bulk from Surat's textile market. Is ONDC for traders too?",
      a: "Yes — ONDC has both B2B and B2C tracks. Tell MSMEMate you sell business-to-business during registration and JodakAI will prefer seller apps that run B2B commerce on the network.",
    },
  },
  {
    slug: "kanpur",
    city: "Kanpur",
    state: "Uttar Pradesh",
    knownAs: "the Leather City",
    industry: "Leather goods and saddlery",
    products: ["Leather saddlery", "Harness", "Leather bags", "Industrial gloves", "Leather footwear"],
    ondcFit: ["Fashion"],
    intro:
      "Kanpur's tanneries and leather workshops built India's reputation in saddlery and harness exports. Its small fabricators — bags, belts, gloves, footwear — can now put the same workmanship in front of Indian retail buyers through ONDC's fashion and accessories categories.",
    faq: {
      q: "Exports are slow — can ONDC give my Kanpur leather unit domestic orders?",
      a: "That is the point of the network: domestic buyers on every connected app can find you. MSMEMate matches you to seller apps covering Uttar Pradesh with onboarding help, so an export-focused unit can open a retail channel in days.",
    },
  },
  {
    slug: "firozabad",
    city: "Firozabad",
    state: "Uttar Pradesh",
    knownAs: "the Glass City (Suhag Nagri)",
    industry: "Glassware and bangles",
    products: ["Glass bangles", "Glassware", "Decorative glass items", "Chandeliers"],
    ondcFit: ["Home & Kitchen", "Fashion"],
    intro:
      "Firozabad's GI-tagged glass craft supplies most of India's glass bangles and a large share of its decorative glassware. Its family-run units traditionally sell through Sadar Bazar-style wholesale chains — ONDC lets the same kilns serve home-décor buyers directly.",
    faq: {
      q: "Glass breaks in shipping. How do ONDC sellers handle that?",
      a: "Logistics providers on the network offer packaging and fragile-handling options, and your seller app sets the shipping terms. When JodakAI ranks seller apps for you, onboarding support — including help with packaging norms for fragile goods — is one of the factors it weighs.",
    },
  },
  {
    slug: "khurja",
    city: "Khurja",
    state: "Uttar Pradesh",
    knownAs: "the Ceramics City",
    industry: "Pottery and ceramics",
    products: ["Ceramic dinnerware", "Pottery", "Decorative ceramics", "Tiles", "Crockery"],
    ondcFit: ["Home & Kitchen"],
    intro:
      "Khurja's GI-tagged pottery cluster has fired ceramics for over a century, and its distinctive blue glaze crockery stocks kitchens across India. For its hundreds of small units, ONDC's Home & Kitchen domain is a direct line to urban buyers hunting for exactly this craft.",
    faq: {
      q: "What documents does a Khurja pottery unit need to start?",
      a: "A free Udyam registration is the anchor — Aadhaar is enough to get it. PAN, GST (where applicable) and bank details come at the seller-app KYC stage. MSMEMate reads your Udyam certificate from a photo and fills your profile automatically.",
    },
  },
  {
    slug: "panipat",
    city: "Panipat",
    state: "Haryana",
    knownAs: "the City of Weavers",
    industry: "Handloom and home furnishings",
    products: ["Bed sheets", "Curtains", "Rugs", "Blankets", "Recycled-yarn textiles"],
    ondcFit: ["Home & Kitchen", "Fashion"],
    intro:
      "Panipat dominates India's home-furnishing and recycled-textile trade — its looms turn out bed linen, curtains and rugs sold in every Indian city, and it is one of the world's biggest textile recycling hubs. Small weaving units here have deep product lines that ONDC's home category rewards.",
    faq: {
      q: "My Panipat unit has 200+ SKUs. Do I type them one by one?",
      a: "No. Export your product list to Excel or CSV — the file you already keep — and MSMEMate's Import Products flow validates every row and maps each item to its ONDC category in one pass.",
    },
  },
  {
    slug: "bhadohi",
    city: "Bhadohi",
    state: "Uttar Pradesh",
    knownAs: "the Carpet City",
    industry: "Hand-knotted carpets",
    products: ["Hand-knotted carpets", "Durries", "Rugs", "Floor coverings"],
    ondcFit: ["Home & Kitchen"],
    intro:
      "Bhadohi's hand-knotted carpet belt holds a GI tag and anchors India's carpet exports, with weaving spread across thousands of rural household looms. ONDC gives these weavers a domestic retail channel that has never really existed for them outside exhibitions.",
    faq: {
      q: "Carpets are high-value items. How do buyers trust a new ONDC seller?",
      a: "Buyer apps show seller ratings that build with fulfilled orders, and your seller app's return policy protects buyers. MSMEMate's matching favours seller apps with strong onboarding support so your first listings, photos and policies are set up right.",
    },
  },
  {
    slug: "aligarh",
    city: "Aligarh",
    state: "Uttar Pradesh",
    knownAs: "the City of Locks (Tala Nagri)",
    industry: "Locks and hardware",
    products: ["Locks", "Padlocks", "Door hardware", "Brass fittings", "Builder hardware"],
    ondcFit: ["Home & Kitchen"],
    intro:
      "Aligarh has made locks for nearly two centuries and still supplies most of India's padlocks and architectural hardware from thousands of micro units. Hardware is a strong ONDC category: standardised products, repeat buyers, and clear specifications.",
    faq: {
      q: "Hardware sells on specifications. Can ONDC listings carry them?",
      a: "Yes — ONDC catalogue attributes cover sizes, materials and variants. When VargBot classifies your products it also extracts attributes from your description, so your listings start with the details buyers filter by.",
    },
  },
  {
    slug: "meerut",
    city: "Meerut",
    state: "Uttar Pradesh",
    knownAs: "India's sports goods capital",
    industry: "Sports goods",
    products: ["Cricket bats", "Cricket balls", "Sports equipment", "Gym equipment", "Scissors"],
    ondcFit: ["Home & Kitchen", "Fashion"],
    intro:
      "Meerut crafts the cricket gear India plays with — bats, balls and protective equipment from hundreds of small workshops — alongside a scissors craft old enough to hold its own GI tag. Sports goods are among the most-searched categories on buyer apps, and Meerut's makers own that supply.",
    faq: {
      q: "Season drives my sports goods sales. Does ONDC help off-season?",
      a: "A network-wide storefront smooths seasonality: school seasons, tournaments and gifting cycles differ across states, and your products are visible in all of them at once rather than only in Meerut's wholesale market.",
    },
  },
  {
    slug: "rajkot",
    city: "Rajkot",
    state: "Gujarat",
    industry: "Engineering and imitation jewellery",
    products: ["Machine parts", "Diesel engine parts", "Bearings", "Imitation jewellery", "Silverware"],
    ondcFit: ["Fashion", "Home & Kitchen"],
    intro:
      "Rajkot runs two very different clusters at once: a machine-parts and casting industry that feeds India's diesel-engine and auto supply chains, and one of the country's largest imitation-jewellery hubs. Both give small units products with steady, nationwide search demand.",
    faq: {
      q: "Which of my two product lines should I put on ONDC first?",
      a: "Start with the line whose buyers are consumers — imitation jewellery typically moves first on buyer apps. MSMEMate classifies both lines, and you can import each catalogue separately so the fit of each is scored on its own.",
    },
  },
  {
    slug: "coimbatore",
    city: "Coimbatore",
    state: "Tamil Nadu",
    knownAs: "the Manchester of South India",
    industry: "Pumps, motors and wet grinders",
    products: ["Water pumps", "Motors", "Wet grinders", "Textiles", "Foundry castings"],
    ondcFit: ["Home & Kitchen", "Electronics"],
    intro:
      "Coimbatore manufactures a majority of India's domestic pumps and motors, and its GI-tagged wet grinder is a fixture in South Indian kitchens. The city's thousands of micro engineering units make exactly the durable home products ONDC buyers search for by brand-agnostic need.",
    faq: {
      q: "Appliances need service support. How does that work on ONDC?",
      a: "Your seller app manages warranty and return terms in the listing, and service expectations are part of the catalogue. MSMEMate surfaces onboarding-support strength in its seller-app ranking so appliance makers pick an SNP that handles after-sales flows well.",
    },
  },
  {
    slug: "solapur",
    city: "Solapur",
    state: "Maharashtra",
    industry: "Terry towels and chaddars",
    products: ["Terry towels", "Solapur chaddars", "Bed sheets", "Uniform fabrics"],
    ondcFit: ["Home & Kitchen"],
    intro:
      "Solapur's terry towels and chaddars both carry GI tags, woven on powerlooms run largely by small family businesses. Home textiles with a GI story behind them stand out on buyer apps — provenance is a selling point national brands cannot copy.",
    faq: {
      q: "How do I show the GI story in my ONDC listings?",
      a: "Put it in your product descriptions — provenance, weave and material. When you describe your business to MSMEMate (in Marathi if you prefer), those details become catalogue attributes and better matches with home-textile seller apps.",
    },
  },
  {
    slug: "kancheepuram",
    city: "Kancheepuram",
    state: "Tamil Nadu",
    knownAs: "the Silk City of the South",
    industry: "Kanchipuram silk sarees",
    products: ["Kanchipuram silk sarees", "Silk fabrics", "Temple-border sarees", "Wedding sarees"],
    ondcFit: ["Fashion"],
    intro:
      "The Kanchipuram silk saree is GI-protected and woven by cooperative and household looms around the temple town. Wedding-season demand for authentic Kanchipuram silk is nationwide — ONDC lets the weaver societies meet it without surrendering their brand to resellers.",
    faq: {
      q: "Buyers fear fake Kanchipuram silk online. How do genuine weavers stand out?",
      a: "Lead with your GI authenticity, cooperative membership and silk-mark details in the catalogue. Honest, specific descriptions also classify better — VargBot's confidence is higher and your matches skew to premium fashion seller apps.",
    },
  },
  {
    slug: "kolhapur",
    city: "Kolhapur",
    state: "Maharashtra",
    industry: "Kolhapuri chappals and jaggery",
    products: ["Kolhapuri chappals", "Leather footwear", "Jaggery (gul)", "Silver jewellery"],
    ondcFit: ["Fashion", "Grocery"],
    intro:
      "The Kolhapuri chappal earned its GI tag as a craft shared with neighbouring Karnataka districts, and Kolhapur's jaggery trade is among Maharashtra's oldest agri-processing clusters. Two GI-anchored products give the city's MSEs instant recognisability on any buyer app.",
    faq: {
      q: "Food items like jaggery need FSSAI. Does MSMEMate check that?",
      a: "Classification results include compliance pointers for your category — FSSAI registration is flagged for food products before you approach a seller app, so KYC does not surprise you.",
    },
  },
  {
    slug: "channapatna",
    city: "Channapatna",
    state: "Karnataka",
    knownAs: "Gombegala Ooru — the Town of Toys",
    industry: "Lacquered wooden toys",
    products: ["Wooden toys", "Lacquerware", "Educational toys", "Home décor"],
    ondcFit: ["Home & Kitchen", "Handicrafts"],
    intro:
      "Channapatna's lacquered wooden toys are GI-tagged, made with ivory-wood and natural dyes by artisan families for over two centuries. Safe, natural, handmade toys are a rising national search — and this one town is India's original supplier.",
    faq: {
      q: "Toys have safety norms. What should a Channapatna artisan know?",
      a: "Natural-dye wooden toys generally sit well within safety norms, but BIS requirements apply to toy retail — your seller app confirms specifics at KYC. MSMEMate flags the compliance item on your classification so you can prepare early.",
    },
  },
  {
    slug: "jodhpur",
    city: "Jodhpur",
    state: "Rajasthan",
    knownAs: "the Blue City",
    industry: "Wooden furniture and handicrafts",
    products: ["Sheesham furniture", "Antique-finish furniture", "Handicrafts", "Bandhej textiles", "Mojaris"],
    ondcFit: ["Home & Kitchen", "Handicrafts"],
    intro:
      "Jodhpur is one of India's largest wooden-furniture export hubs — sheesham and mango-wood pieces from its workshops fill 'artisan furniture' shelves worldwide. The same workshops can serve India's booming home-décor demand directly through ONDC.",
    faq: {
      q: "Furniture is bulky. Can small Jodhpur workshops really ship it?",
      a: "Network logistics providers handle heavy and bulky categories with their own rate cards, and your seller app configures serviceable areas. JodakAI's geographic-coverage factor makes sure the seller apps it recommends actually serve Rajasthan pickups.",
    },
  },
  {
    slug: "amritsar",
    city: "Amritsar",
    state: "Punjab",
    industry: "Phulkari and food products",
    products: ["Phulkari dupattas", "Shawls", "Papad and warian", "Pickles", "Juttis"],
    ondcFit: ["Fashion", "Grocery"],
    intro:
      "Amritsar's GI-tagged phulkari embroidery and its papad-warian food trade are both household names across North India. The city's women-led micro enterprises in embroidery and food processing are precisely the sellers ONDC's inclusion mandate exists for.",
    faq: {
      q: "Our phulkari unit is run by women at home. Is registration complicated?",
      a: "It is voice-first on purpose: speak in Punjabi or Hindi, and Sathi fills the form, validates your email and PAN aloud, and records consent. No forms in English, no agent fees.",
    },
  },
  {
    slug: "bhagalpur",
    city: "Bhagalpur",
    state: "Bihar",
    knownAs: "the Silk City of the East",
    industry: "Tussar (Bhagalpuri) silk",
    products: ["Bhagalpuri silk sarees", "Tussar silk fabrics", "Stoles", "Linen blends"],
    ondcFit: ["Fashion"],
    intro:
      "Bhagalpur's tussar silk — the famous Bhagalpuri silk — is GI-tagged and woven across household looms that have supplied India's handloom trade for generations. Eastern India's weavers are under-represented online; ONDC plus voice-first onboarding closes that gap.",
    faq: {
      q: "Internet is patchy in our weaving village. Can we still register?",
      a: "Registration takes minutes on a basic smartphone connection, and the voice flow needs far less typing than a form. Once registered, your seller app manages the always-online storefront — your loom does not need to be.",
    },
  },
  {
    slug: "madurai",
    city: "Madurai",
    state: "Tamil Nadu",
    knownAs: "the Temple City",
    industry: "Sungudi sarees and jasmine",
    products: ["Sungudi cotton sarees", "Madurai malli (jasmine)", "Cotton textiles", "Idols and temple items"],
    ondcFit: ["Fashion", "Grocery"],
    intro:
      "Madurai holds two GI tags of its own — Sungudi tie-dye cotton sarees and the fragrant Madurai malli jasmine. Its handloom cooperatives and flower-market micro traders both fit ONDC categories with strong daily demand in Tamil Nadu and beyond.",
    faq: {
      q: "Perishables like jasmine — does ONDC handle same-day delivery?",
      a: "Hyperlocal buyer apps on the network run same-day and slot-based delivery for perishables in serviceable cities. Your seller app defines your serviceable radius; JodakAI prefers SNPs whose coverage genuinely includes Madurai.",
    },
  },
];

export function getCity(slug: string): CityCluster | undefined {
  return CITY_CLUSTERS.find((c) => c.slug === slug);
}
