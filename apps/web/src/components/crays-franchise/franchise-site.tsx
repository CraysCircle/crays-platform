import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Cpu,
  Handshake,
  Landmark,
  Megaphone,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { FranchiseShell } from "./franchise-shell";
import {
  FranchiseFeatureSlider,
  PropertyForm,
  StakeholderSlider,
} from "./franchise-site-interactive";
import styles from "./franchise-site.module.css";

const root = "/crays-franchise";

const concepts = [
  {
    key: "coffee",
    name: "CRAYS COFFEE",
    label: "Neighborhood cafés",
    equity: "€10K",
    area: "25 m²",
    description:
      "Build a hospitality-led neighborhood business around service, ordering, wallet and loyalty.",
    image: "/assets/images/crays-franchise/concepts/crays-coffee-customer.jpg",
    crop: "43% 50%",
    fit: ["Ground-floor frontage", "Daily footfall", "Indoor and terrace potential"],
  },
  {
    key: "retail",
    name: "CRAYS RETAIL",
    label: "Destination retail",
    equity: "€25K",
    area: "100 m²",
    description:
      "Shape a destination-retail business that connects assortment, inventory, fulfilment and loyalty.",
    image: "/assets/images/crays-franchise/concepts/crays-retail-customer.jpg",
    crop: "55% 50%",
    fit: ["Visible retail units", "Flexible merchandising", "Reliable logistics access"],
  },
  {
    key: "gym",
    name: "CRAYS GYM",
    label: "Performance spaces",
    equity: "€50K",
    area: "500 m²",
    description:
      "Operate a digitally supported fitness business built around training, access, booking and member experience.",
    image: "/assets/images/crays-franchise/concepts/crays-gym-performance.jpg",
    crop: "50% 45%",
    fit: ["High-visibility urban sites", "Flexible training floor", "Strong local catchment"],
  },
  {
    key: "clubs",
    name: "CRAYS CLUBS",
    label: "Work, live and play",
    equity: "€500K",
    area: "1,000 m²",
    description:
      "Create a membership and hospitality business around rooms, events, work and shared experiences.",
    image: "/assets/images/crays-franchise/concepts/crays-coffee-coworking.jpg",
    crop: "50% 50%",
    fit: ["Character buildings", "Mixed-use destinations", "Hospitality potential"],
  },
];

const conceptOverviewComparison = [
  {
    key: "coffee",
    index: "01",
    venture: "CRAYS COFFEE",
    descriptor: "Compact, design-led Coffee customer experience",
    minimumArea: "STARTING WITH 25 m²",
    equity: "OWN CAPITAL FROM €10K",
    propertyPattern:
      "Compact-space opportunity. The confirmed public indicator is the 25 m² starting point; exact frontage, footfall, terrace, technical and location fit remain assessment-specific.",
    operatingCore:
      "Coffee-specific ordering and service, wallet and loyalty, locations and customer experience.",
    customerDomain: "www.crays.coffee",
    customerHref: "https://www.crays.coffee/",
    customerContext:
      "Coffee B2C/customer experience; unchanged by this CRAYS.pro concept page.",
    sharedAuthority:
      "Use CRAYS.pro for your Franchise acquisition, Shared Login, stakeholder Portal and released shared SaaS capabilities. Your Coffee customer experience remains at its dedicated B2C destination.",
    image: "/assets/images/crays-franchise/concepts/crays-coffee-customer.jpg",
    crop: "43% 50%",
    alt: "Coffee customer holding a takeaway cup and phone",
  },
  {
    key: "retail",
    index: "02",
    venture: "CRAYS RETAIL",
    descriptor: "Retail definition in development",
    minimumArea: "STARTING WITH 100 m²",
    equity: "OWN CAPITAL FROM €25K",
    propertyPattern:
      "TBD. The 100 m² starting point is confirmed; frontage, logistics, technical requirements and final property-fit criteria are not yet approved.",
    operatingCore:
      "TBD. Assortment, automation, commerce and fulfilment choices remain under definition and are not presented as confirmed facts.",
    customerDomain: "www.crays.shop",
    customerHref: "https://www.crays.shop/",
    customerContext:
      "CRAYS Store customer experience; now live at its dedicated customer destination.",
    sharedAuthority:
      "Use CRAYS.pro for your Franchise acquisition, Shared Login, stakeholder Portal and released shared SaaS capabilities. Your Retail customer experience is available at its dedicated CRAYS Store destination.",
    image: "/assets/images/crays-franchise/concepts/crays-retail-customer.jpg",
    crop: "55% 50%",
    alt: "Retail customer holding a payment card and shopping bags",
  },
  {
    key: "gym",
    index: "03",
    venture: "CRAYS GYM",
    descriptor: "Performance and training customer experience",
    minimumArea: "STARTING WITH 500 m²",
    equity: "OWN CAPITAL FROM €50K",
    propertyPattern:
      "Performance-space opportunity. Training floor, visibility, catchment, access, technical and planning fit remain property- and format-specific.",
    operatingCore:
      "Gym-specific membership, training, booking, access and Studio or Gym operations.",
    customerDomain: "www.craysgym.com",
    customerHref: "https://www.craysgym.com/",
    customerContext:
      "Gym B2C member/customer experience; unchanged by this CRAYS.pro concept page.",
    sharedAuthority:
      "Use CRAYS.pro for your Franchise acquisition, Shared Login, stakeholder Portal and released shared SaaS capabilities. Your Gym member experience remains at its dedicated B2C destination.",
    image: "/assets/images/crays-franchise/concepts/crays-gym-performance.jpg",
    crop: "50% 45%",
    alt: "CRAYS Gym performance training environment",
  },
  {
    key: "clubs",
    index: "04",
    venture: "CRAYS CLUBS",
    descriptor: "Hospitality-scale work, live and play experience",
    minimumArea: "STARTING WITH 1,000 m²",
    equity: "OWN CAPITAL FROM €500K",
    propertyPattern:
      "Hospitality-scale work, live and play opportunity. Building character, mixed-use context, rooms, events, access, technical and planning fit remain assessment-specific.",
    operatingCore:
      "Clubs-specific membership, booking, rooms, events and hospitality.",
    customerDomain: "www.craysclub.com",
    customerHref: "https://www.craysclub.com/",
    customerContext:
      "Clubs B2C guest/customer experience; unchanged by this CRAYS.pro concept page.",
    sharedAuthority:
      "Use CRAYS.pro for your Franchise acquisition, Shared Login, stakeholder Portal and released shared SaaS capabilities. Your Clubs guest experience remains at its dedicated B2C destination.",
    image: "/assets/images/crays-franchise/concepts/crays-coffee-coworking.jpg",
    crop: "50% 50%",
    alt: "CRAYS Clubs premium hospitality lounge",
  },
] as const;

const process = [
  ["01", "PROPERTY IN", "You introduce your property once, without choosing a CRAYS Venture in advance."],
  ["02", "FOUR-CONCEPT FIT", "We review your property separately against each relevant CRAYS Format."],
  ["03", "DEAL PACKAGE", "You see how an approved fit can become one versioned, decision-ready opportunity."],
  ["04", "PARTNER MATCH", "You compare a released opportunity within your approved relationship and scope."],
  ["05", "FUNDING", "You and your selected lender review the evidence released for that financing decision."],
  ["06", "BUILD & OPEN", "After every required approval, your project can move into delivery and operation."],
];

const stakeholderSlides = [
  {
    title: "PROPERTY OWNERS & BROKERS",
    headline: "TURN ONE PROPERTY INTO FOUR BUSINESS OPTIONS.",
    copy: "Bring the location once. CRAYS combines location intelligence, property facts and four Venture models to show where Coffee, Retail, Gym or Clubs could create the strongest case—then connects the opportunity with the operators, capital and delivery capability it still needs.",
    href: "/real-estate",
    cta: "EXPLORE YOUR PROPERTY'S POTENTIAL",
    secondaryHref: null,
    secondary: null,
    image: "/assets/images/crays-franchise/stakeholders/property-adaptive-reuse.jpg",
    alt: "Brick-and-steel commercial interior with open floor space",
    objectPosition: "50% 50%",
  },
  {
    title: "FRANCHISE PARTNERS",
    headline: "START WITH A REAL OPPORTUNITY—NOT A BLANK BUSINESS PLAN.",
    copy: "Choose the business you want to run. CRAYS brings forward released, location-backed opportunities with the property, financial model, business plan and concept view already connected for evaluation.",
    href: "/franchise-partners",
    cta: "FIND YOUR CRAYS BUSINESS",
    secondaryHref: null,
    secondary: null,
    image: "/assets/images/crays-franchise/stakeholders/candidate-opportunity-review.jpeg",
    alt: "Four people reviewing information together around a tablet",
    objectPosition: "50% 50%",
  },
  {
    title: "FINANCING PARTNERS",
    headline: "SEE A BETTER-PREPARED CASE BEFORE YOU DECIDE.",
    copy: "Bring your underwriting perspective. CRAYS connects the selected property, operator, financial model and supporting evidence into one funding case—while your institution keeps the independent credit decision.",
    href: "/funding-partners",
    cta: "SEE THE FUNDING PARTNER ROUTE",
    secondaryHref: null,
    secondary: null,
    image: "/assets/images/crays-franchise/stock/stakeholder-funding-review.jpeg",
    alt: "A diverse group reviewing a funding case together",
    objectPosition: "50% 44%",
  },
  {
    title: "INVESTORS",
    headline: "FIND THE GROWTH STORY THAT FITS YOUR MANDATE.",
    copy: "Bring your investment thesis. CRAYS helps you review released opportunities with location, concept and financial context in view, so you can decide what deserves deeper diligence—without promising availability or return.",
    href: "/investors",
    cta: "EXPLORE THE INVESTMENT THESIS",
    secondaryHref: null,
    secondary: null,
    image: "/assets/images/crays-franchise/stock/stakeholder-investor-diligence.jpeg",
    alt: "An investor reviewing performance and market information",
    objectPosition: "50% 50%",
  },
  {
    title: "VENDORS & DELIVERY PARTNERS",
    headline: "PUT YOUR CAPABILITY WHERE THE NEXT OPENING NEEDS IT.",
    copy: "Bring construction, fit-out, equipment, technology or specialist delivery capability. CRAYS matches qualified partners with relevant opening needs, while registration begins qualification and does not guarantee work.",
    href: "/vendors",
    cta: "INTRODUCE YOUR CAPABILITY",
    secondaryHref: null,
    secondary: null,
    image: "/assets/images/crays-franchise/stock/stakeholder-vendor-delivery-opening.png",
    alt: "A fit-out team coordinating plans, finishes and equipment for a new location",
    objectPosition: "50% 50%",
  },
] as const;

const operatingSystemSlides = [
  {
    eyebrow: "FROM LOCATION TO OPENING",
    title: "OPEN WITH ONE SHARED PLAN\u2014NOT TEN DISCONNECTED TOOLS.",
    copy: "Projects, PPM, Drive and collaboration keep your decisions, documents, responsibilities and deadlines around the same location and opening plan.",
    detail: "You and the people supporting your opening work from the same route.",
    href: "/franchise-partners#operating-system",
    cta: "FOLLOW THE WORKFLOW",
    image: "/assets/images/crays-franchise/stock/operating-opening-collaboration.png",
    alt: "A team coordinating an opening plan in a shared workspace",
    objectPosition: "48% 50%",
  },
  {
    eyebrow: "EVERYDAY OPERATIONS",
    title: "RUN SALES, PEOPLE, STOCK AND NUMBERS FROM ONE BACKBONE.",
    copy: "ERP, HR and Operations connect purchasing, staffing, Store work and financial performance so you can act before small exceptions become expensive ones.",
    detail: "One operating picture helps you protect time, margin and service quality.",
    href: "/franchise-partners#operating-system",
    cta: "EXPLORE DAILY OPERATIONS",
    image: "/assets/crays-store/auto-checkout-store.png",
    alt: "A digitally operated CRAYS Retail store",
    objectPosition: "50% 52%",
  },
  {
    eyebrow: "MARKETING INCLUDED",
    title: "LAUNCH LOCAL MARKETING WITHOUT BUILDING A SECOND TECH STACK.",
    copy: "Plan campaigns, use brand-ready content, publish local journeys and connect every response back to your business\u2014with the CRAYS Marketing workspace included.",
    detail: "Turn brand strength into measurable local demand and follow-up.",
    href: "/franchise-partners#marketing",
    cta: "SEE YOUR MARKETING ENGINE",
    image: "/assets/images/crays-pro-portal-community-generated.png",
    alt: "A premium CRAYS community space prepared for local marketing",
    objectPosition: "50% 48%",
  },
  {
    eyebrow: "CUSTOMER RELATIONSHIPS",
    title: "TURN EVERY ENQUIRY INTO A RELATIONSHIP YOU CAN GROW.",
    copy: "CRM keeps your local enquiries, customers, bookings, memberships and follow-up connected, so you can act on the full customer story instead of rebuilding it after every visit.",
    detail: "See the next useful action in the right customer context.",
    href: "/franchise-partners#operating-system",
    cta: "SEE THE OPERATING SYSTEM",
    image: "/assets/images/crays-franchise/stakeholders/candidate-working.jpeg",
    alt: "Two business partners reviewing work on a tablet",
    objectPosition: "52% 50%",
  },
  {
    eyebrow: "WORK PARTNER INCLUDED",
    title: "GET A CRAYS WORK PARTNER BESIDE YOU\u2014INCLUDED.",
    copy: "Your OpenClaw-powered CRAYS work partner helps prepare the day, surface exceptions and guide repeatable work using your approved business context\u2014at no additional franchise fee.",
    detail: "More support for the work. You and your approved team remain in control.",
    href: "/franchise-partners#work-partner",
    cta: "MEET YOUR WORK PARTNER",
    image: "/assets/images/candidate-community-operator-hero.png",
    alt: "A CRAYS operator and team working in a gym",
    objectPosition: "48% 44%",
  },
  {
    eyebrow: "FOR YOUR GUESTS",
    title: "STAY USEFUL BEFORE, DURING AND AFTER EVERY VISIT.",
    copy: "Across Coffee, Retail, Gym and Clubs, the CRAYS guest partner is designed to help your guests discover, choose, book and continue their journey after the visit\u2014with their permission.",
    detail: "Create a stronger guest relationship without adding another disconnected channel.",
    href: "/franchise-partners#guest-life-partner",
    cta: "SEE THE GUEST JOURNEYS",
    image: "/assets/images/crays-franchise/stock/guest-relationship-cycling.jpg",
    alt: "Two guests sharing a positive moment in a CRAYS fitness environment",
    objectPosition: "50% 50%",
  },
] as const;

const partnerSalesOutcomes = [
  {
    number: "01",
    title: "START FURTHER AHEAD.",
    copy: "Explore a released, location-backed opportunity where one is available\u2014instead of beginning with a blank business plan and an empty property search.",
  },
  {
    number: "02",
    title: "RUN ONE CONNECTED BUSINESS.",
    copy: "Move from evaluation to opening and everyday operations with CRM, projects, documents, ERP, people, marketing and insights designed to work together.",
  },
  {
    number: "03",
    title: "BUILD BEYOND THE FIRST VISIT.",
    copy: "Connect local marketing and each Venture\u2019s guest experience so a transaction can become a continuing customer relationship, with the customer\u2019s permission.",
  },
] as const;

const pageCopy: Record<string, { eyebrow: string; title: string; intro: string }> = {
  concepts: {
    eyebrow: "CHOOSE YOUR CRAYS VENTURE",
    title: "FOUR VENTURES. FIND THE BUSINESS THAT FITS YOU.",
    intro:
      "Compare four distinct customer experiences, property patterns and operating responsibilities before you choose your next step.",
  },
  "property-owners": {
    eyebrow: "YOUR PROPERTY",
    title: "EXPLORE MORE THAN ONE FUTURE FOR YOUR PROPERTY.",
    intro:
      "Introduce your site once. We assess how its layout, access, technical base and commercial context align with four distinct Ventures.",
  },
  "franchise-partners": {
    eyebrow: "YOUR FRANCHISE PATH",
    title: "START YOUR DECISION WITH A LOCATION-BACKED OPPORTUNITY.",
    intro:
      "Move beyond a blank business plan. Explore governed deal packages that bring the property, concept and decision material together.",
  },
  deals: {
    eyebrow: "YOUR OPPORTUNITY VIEW",
    title: "COMPARE ONLY THE OPPORTUNITIES RELEASED FOR REVIEW.",
    intro:
      "Use the marketplace to discover public CRAYS opportunities. You receive detailed property and commercial evidence only within an approved relationship and release.",
  },
  partners: {
    eyebrow: "THE CRAYS ASSOCIATION",
    title: "ONE WIDER ECOSYSTEM. SEPARATE RELATIONSHIPS.",
    intro:
      "Connect physical places, community, technology, governance and capital through a neutral coordination frame without merging independent contracts, economics or permissions.",
  },
  "funding-partners": {
    eyebrow: "YOUR FUNDING REVIEW",
    title: "START A BETTER PREPARED CREDIT CONVERSATION.",
    intro:
      "Review borrower readiness, capital requirement, location evidence, the operating case, scenarios and conditions in a consistent dossier.",
  },
  investors: {
    eyebrow: "YOUR INVESTMENT VIEW",
    title: "REVIEW THE SYSTEM BEHIND EACH FORMAT.",
    intro:
      "Understand how concepts, locations, operators and the shared platform connect—without turning the public site into an offer or promise.",
  },
  suppliers: {
    eyebrow: "YOUR DELIVERY CAPABILITY",
    title: "BRING YOUR CAPABILITY INTO A REPEATABLE DELIVERY NETWORK.",
    intro:
      "Present your capabilities once, align to defined scopes and participate in governed project delivery as opportunities become available.",
  },
  "how-it-works": {
    eyebrow: "YOUR CRAYS ROUTE",
    title: "SEE HOW YOUR PROPERTY OR BUSINESS CAN MOVE FORWARD.",
    intro:
      "Use one shared workflow to reduce repetition, see dependencies and receive the information appropriate to your approved relationship.",
  },
  login: {
    eyebrow: "SHARED CRAYS ACCESS",
    title: "ONE LOGIN. THE RIGHT WORKSPACE.",
    intro:
      "Your relationship determines what you can see and do. Selecting a route begins the correct onboarding; it does not grant access by itself.",
  },
};

function Action({
  href,
  children,
  dark = false,
}: {
  href: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return <Link className={`${styles.action} ${dark ? styles.actionDark : ""}`} href={href}>{children}<ArrowRight size={18} /></Link>;
}

function OperatingSystemHome() {
  const navigation = {
    eyebrow: "THE CRAYS OPERATING SYSTEM",
    title: "ONE BUSINESS. EVERYTHING YOU NEED TO RUN IT.",
    copy: "From your approved location to opening day and local growth, CRAYS gives you one connected operating environment instead of a stack you have to assemble yourself.",
    href: "/franchise-partners#operating-system",
    cta: "SEE WHAT IS INCLUDED",
    items: [
      "MOVE FROM LOCATION TO OPENING",
      "RUN SALES, PEOPLE, STOCK AND NUMBERS",
      "LAUNCH LOCAL MARKETING",
      "GROW EVERY CUSTOMER RELATIONSHIP",
      "WORK WITH YOUR CRAYS AI PARTNER",
      "STAY WITH GUESTS BEYOND THE VISIT",
    ],
  } as const;

  return (
    <section className={styles.operatingSystemHome} aria-label="The CRAYS Operating System">
      <div className={styles.operatingSystemLayout}>
        <FranchiseFeatureSlider
          id="operating-system-benefits"
          label="CRAYS Operating System partner advantages"
          slides={operatingSystemSlides}
          navigation={navigation}
        />
      </div>
    </section>
  );
}

const craysSocialLinks = [
  { label: "GitHub", href: "https://github.com/CraysCircle", icon: "https://www.crays.org/assets/footer-icons/github.svg" },
  { label: "X", href: "https://x.com/CraysCircle", icon: "https://www.crays.org/assets/footer-icons/x.svg" },
  { label: "Open Collective", href: "https://opencollective.com/crays", icon: "https://www.crays.org/assets/footer-icons/opencollective.svg" },
  { label: "Reddit", href: "https://www.reddit.com/r/Crays/", icon: "https://www.crays.org/assets/footer-icons/reddit.svg" },
  { label: "Telegram", href: "https://t.me/craysclub", icon: "https://www.crays.org/assets/footer-icons/telegram.svg" },
  { label: "TikTok", href: "https://www.tiktok.com/@thorbenbiesenbac1", icon: "https://www.crays.org/assets/footer-icons/tiktok.svg" },
  { label: "YouTube", href: "https://www.youtube.com/@CraysCircle", icon: "https://www.crays.org/assets/footer-icons/youtube.svg" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/crays/", icon: "https://www.crays.org/assets/footer-icons/linkedin.svg" },
  { label: "Instagram", href: "https://www.instagram.com/crays_circle/", icon: "https://www.crays.org/assets/footer-icons/instagram.svg" },
  { label: "Nostr", href: "https://www.crays.net/", icon: "https://www.crays.org/assets/footer-icons/nostr.webp" },
  { label: "Discord", href: "https://discord.gg/dpYZk8xAvR", icon: "https://www.crays.org/assets/footer-icons/discord.svg" },
] as const;

function OperatingSystemMarquee() {
  const opportunityTrack = "FOUR OPPORTUNITIES    FOUR OPPORTUNITIES    FOUR OPPORTUNITIES    FOUR OPPORTUNITIES    ";
  const operatingSystemTrack = "ONE OPERATING SYSTEM    ONE OPERATING SYSTEM    ONE OPERATING SYSTEM    ONE OPERATING SYSTEM    ";

  return (
    <section className={styles.heroCommunity} aria-labelledby="hero-community-title">
      <div className={styles.heroCommunityMotion} aria-hidden="true">
        <div className={`${styles.heroCommunityLine} ${styles.heroCommunityLineOutline}`}>
          <span>{opportunityTrack}</span>
          <span>{opportunityTrack}</span>
        </div>
        <div className={`${styles.heroCommunityLine} ${styles.heroCommunityLineSolid}`}>
          <span>{operatingSystemTrack}</span>
          <span>{operatingSystemTrack}</span>
        </div>
      </div>
      <p id="hero-community-title" className={styles.heroCommunityCopy}>
        BE PART OF OUR CRAYS COMMUNITY
      </p>
      <nav className={styles.heroCommunitySocials} aria-label="CRAYS social media">
        {craysSocialLinks.map((social) => (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            aria-label={social.label}
            title={social.label}
          >
            <Image
              unoptimized
              src={social.icon}
              alt=""
              width={22}
              height={22}
              aria-hidden="true"
            />
          </a>
        ))}
      </nav>
    </section>
  );
}

function OperatingModuleBanner() {
  return (
    <div className={styles.operatingModuleBanner} aria-label="CRAYS Operating System modules">
      <div>
        <span>CRM</span><i />
        <span>PROJECTS &amp; PPM</span><i />
        <span>DRIVE &amp; COLLABORATION</span><i />
        <span>ERP</span><i />
        <span>HR</span><i />
        <span>OPERATIONS</span><i />
        <span>MARKETING</span><i />
        <span>INSIGHTS</span><i />
        <span>LENDING</span><i />
        <span>SYNC</span>
      </div>
    </div>
  );
}

function PartnerSalesClose() {
  return (
    <section className={styles.partnerSalesClose} aria-labelledby="partner-sales-close-title">
      <div className={styles.partnerSalesCloseLead}>
        <p>THE CRAYS ADVANTAGE</p>
        <h2 id="partner-sales-close-title">START FURTHER AHEAD.<br />RUN SMARTER.<br />KEEP CUSTOMERS CLOSER.</h2>
        <p>A franchise should give you more than a name. CRAYS is designed to put the opportunity, the opening work, daily operations and local growth into one connected business environment&mdash;so your energy goes into building the business, not assembling the infrastructure around it.</p>
        <Link href="/franchise-partners" className={styles.partnerSalesCloseAction}>
          EXPLORE THE CRAYS FRANCHISE
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <div className={styles.partnerSalesCloseMedia}>
        <Image
          src="/assets/images/crays-franchise/stock/franchise-fee-partner-environment.avif"
          fill
          sizes="(max-width: 900px) 100vw, 58vw"
          alt="Guests gathering around a rooftop pool at a premium leisure destination"
        />
        <div className={styles.partnerSalesCloseOffer}>
          <p>CRAYS FRANCHISE</p>
          <strong>JUST A 5%<br />FRANCHISE FEE.</strong>
          <span>Marketing workspace included. OpenClaw-powered CRAYS work partner included at no additional franchise fee.</span>
        </div>
      </div>
      <ol className={styles.partnerSalesCloseOutcomes}>
        {partnerSalesOutcomes.map((outcome) => (
          <li key={outcome.number}>
            <span>{outcome.number}</span>
            <h3>{outcome.title}</h3>
            <p>{outcome.copy}</p>
          </li>
        ))}
      </ol>
      <p className={styles.partnerSalesCloseTruth}>Prepared opportunities depend on availability and approval. Franchise award, property fit, financing, return and opening are never guaranteed. Guest and work-partner capabilities are introduced through the applicable CRAYS Venture and release stage.</p>
    </section>
  );
}

function HomeClosing() {
  return (
    <section className={styles.homeClosing} aria-labelledby="home-closing-title">
      <div className={styles.homeClosingHeading}>
        <p>CHOOSE YOUR ROUTE</p>
        <h2 id="home-closing-title">BRING THE PLACE.<br />OR BUILD THE BUSINESS.</h2>
      </div>
      <div className={styles.homeClosingRoutes}>
        <Link href="/real-estate#submit-property" className={styles.homeClosingProperty}>
          <span>01 / PROPERTY OWNERS &amp; BROKERS</span>
          <h3>WHAT COULD YOUR PROPERTY BECOME?</h3>
          <p>Introduce it once. Explore its fit across Coffee, Retail, Gym and Clubs through separate, evidence-led decisions.</p>
          <strong>INTRODUCE YOUR PROPERTY <ArrowRight aria-hidden="true" /></strong>
        </Link>
        <Link href="/franchise-partners" className={styles.homeClosingFranchise}>
          <span>02 / FRANCHISE PARTNERS</span>
          <h3>WHICH CRAYS BUSINESS FITS YOU?</h3>
          <p>Compare the Ventures, see what CRAYS puts behind your business and start from a prepared opportunity.</p>
          <strong>EXPLORE YOUR FRANCHISE PATH <ArrowRight aria-hidden="true" /></strong>
        </Link>
      </div>
    </section>
  );
}

function Home() {
  return (
    <>
      <section className={styles.approvedHero}>
        <Image src="/assets/images/crays-franchise/crays-pro-hero-lounge-user.jpg" fill priority sizes="100vw" alt="Hospitality lounge overlooking the city" />
        <div className={styles.approvedShade} />
        <div className={styles.approvedContent}>
          <div className={styles.approvedNarrative}>
            <p className={styles.approvedEyebrow}>CRAYS FRANCHISE – Just a 5% Franchise Fee</p>
            <h1>
              <span className={styles.heroHeadlineLead}>PROPERTIES MEET<br />ENTREPRENEURS</span>
              <span className={styles.heroHeadlineClose}>FIND THE PERFECT MATCH.</span>
            </h1>
          </div>
          <div className={styles.approvedRoutes}>
            <article>
              <div className={styles.routeTitle}><Building2 /><span>REAL ESTATE - EXPLORE YOUR PROPERTY&apos;S FIT</span></div>
              <p>Bring the property. CRAYS explores where it can create the strongest business case.</p>
              <Action href="/real-estate#submit-property">INTRODUCE YOUR PROPERTY</Action>
              <Link className={styles.approvedTextLink} href="/real-estate">REVIEW YOUR PROPERTY ROUTE <ArrowRight /></Link>
            </article>
            <article>
              <div className={styles.routeTitle}><Users /><span>FRANCHISE PARTNER - FIND YOUR FRANCHISE PATH</span></div>
              <p>Choose the business you want to build—then start with a location-backed opportunity.</p>
              <Action href="/franchise-partners">EXPLORE YOUR FRANCHISE PATH</Action>
              <Link className={styles.approvedTextLink} href="/deals">REVIEW RELEASED OPPORTUNITIES <ArrowRight /></Link>
            </article>
          </div>
        </div>
      </section>
      <section className={styles.approvedProcess} aria-label="Connected deal flow">
        {process.map((item, index) => (
          <Link href="/#how-it-works" key={item[1]}>
            {item[1]}{index < process.length - 1 && <ArrowRight />}
          </Link>
        ))}
      </section>
      <OperatingSystemMarquee />
      <section className={`${styles.homepageEditorialPanel} ${styles.homepageWhy}`} aria-labelledby="homepage-why-title">
        <div className={styles.homepageEditorialHeading}>
          <p className={styles.homepageEditorialLabel}>FROM MATCH TO MARKET.</p>
          <h2 id="homepage-why-title">
            <span>MATCH THE PARTNERS.</span>
            <span>FUND THE BUSINESS.</span>
            <span>BUILD WITH CRAYS.</span>
          </h2>
        </div>
        <div className={styles.homepageEditorialAside}>
          <p>CRAYS connects the right Property Owners, Franchise Partners, Vendors and Financing Partners in one ecosystem. From the first match to the grand opening, everything you need to launch and grow is already built in—your operating system, marketing engine and specialist network.</p>
        </div>
      </section>
      <section className={styles.approvedConcepts} aria-label="CRAYS concepts ordered by required own capital">
        {concepts.map((concept) => (
          <Link
            href={`/concepts/${concept.key}`}
            key={concept.key}
          >
            <Image
              src={concept.image}
              fill
              sizes="(max-width: 700px) 100vw, 50vw"
              style={{ objectPosition: concept.crop }}
              alt={`${concept.name} concept`}
            />
            <div className={styles.approvedConceptShade} />
            <div className={styles.approvedConceptCopy}>
              <div className={styles.approvedBadges}>
                <span className={styles.approvedBadge}>OWN CAPITAL <strong>FROM {concept.equity}</strong></span>
                <span className={styles.approvedBadge}>MINIMUM AREA <strong>FROM {concept.area}</strong></span>
              </div>
              <h2>{concept.name}</h2>
              <p>{concept.label}</p>
              <ArrowRight />
            </div>
          </Link>
        ))}
      </section>
      <StakeholderSlider slides={stakeholderSlides} />
      <OperatingSystemHome />
      <section id="how-it-works" className={`${styles.homepageEditorialPanel} ${styles.homepageHow}`} aria-labelledby="homepage-how-title">
        <div className={styles.dataFoundationMasthead}>
          <div className={styles.homepageEditorialHeading}>
            <p className={styles.homepageEditorialLabel}>HOW CRAYS SUPPORTS THE OPPORTUNITY</p>
            <h2 id="homepage-how-title">100%<br />DATA-DRIVEN.</h2>
          </div>
          <div className={styles.homepageEditorialAside}>
            <h3 className={styles.dataFoundationLead}>BETTER INPUTS.<br />BETTER BUSINESS DECISIONS.</h3>
            <p>Location, property, commercial, financial and delivery facts are reviewed together before a route moves forward—so you can see the opportunity, the assumptions and the questions still to answer.</p>
          </div>
        </div>
        <aside className={styles.dataFoundationAi} aria-labelledby="data-foundation-ai-title">
          <Bot aria-hidden="true" />
          <div>
            <p>YOUR PERSONAL CRAYS AI PARTNER</p>
            <h3 id="data-foundation-ai-title">CRAYS provides every stakeholder with a personalized OpenClaw AI agent equipped with the skills needed to automate work across both their business and personal life.</h3>
            <span>Authorized capabilities are released in phases and remain role- and context-scoped.</span>
          </div>
        </aside>
        <ol className={styles.dataFoundationProofs} aria-label="Three principles of the CRAYS data foundation">
          <li>
            <span aria-hidden="true">01</span>
            <h3>SEE THE WHOLE OPPORTUNITY</h3>
            <p>Bring location, property, market, commercial, financial, design and opening evidence into one decision picture.</p>
          </li>
          <li>
            <span aria-hidden="true">02</span>
            <h3>DECIDE WITH CONTEXT</h3>
            <p>Understand why a route advances, what still needs proof and which next step creates the most value.</p>
          </li>
          <li>
            <span aria-hidden="true">03</span>
            <h3>KNOW WHAT IS PROVEN</h3>
            <p>Separate evidence from assumptions and gaps, with sources, dates and versions visible in the released view.</p>
          </li>
        </ol>
        <OperatingModuleBanner />
      </section>
      <section className={styles.propertyOpportunity} aria-labelledby="property-opportunity-title">
        <header className={styles.propertyOpportunityHeader}>
          <div>
            <p className={styles.approvedEyebrow}>YOUR PROPERTY</p>
            <h2 id="property-opportunity-title">WHICH CRAYS<br />VENTURES COULD FIT<br />YOUR PROPERTY?</h2>
          </div>
          <div className={styles.propertyOpportunitySummary}>
            <p>Bring the property once. CRAYS explores the relevant Coffee, Retail, Gym and Clubs routes, so you do not have to bet on one use before the evidence is in.</p>
            <Action href="/real-estate#submit-property">INTRODUCE YOUR PROPERTY</Action>
          </div>
        </header>

        <nav className={styles.propertyOpportunityHighlights} aria-label="Property opportunity journey">
          <Link href="/real-estate#submit-property">
            <Building2 aria-hidden="true" />
            <span><strong>BRING IT ONCE</strong><small>One structured property introduction.</small></span>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/real-estate">
            <Store aria-hidden="true" />
            <span><strong>COMPARE FOUR VENTURES</strong><small>Coffee, Retail, Gym and Clubs in view.</small></span>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/deals">
            <BarChart3 aria-hidden="true" />
            <span><strong>MOVE WITH EVIDENCE</strong><small>Review a released, prepared route.</small></span>
            <ArrowRight aria-hidden="true" />
          </Link>
        </nav>

        <div className={styles.propertyOpportunityGrid}>
          <Link href="/real-estate" className={`${styles.propertyOpportunityCard} ${styles.propertyFitCard}`}>
            <div className={styles.propertyOpportunityMedia}>
              <Image src="/assets/images/crays-franchise/property-opportunity-city.jpg" fill sizes="(max-width: 900px) 100vw, 52vw" alt="City property landscape for a CRAYS multi-format review" />
              <span>01 / PROPERTY FIT</span>
            </div>
            <div className={styles.propertyOpportunityBody}>
              <p>MULTI-FORMAT REVIEW</p>
              <h3>DON&apos;T CHOOSE THE FORMAT BEFORE YOU KNOW THE FIT.</h3>
              <p>CRAYS compares the property&apos;s layout, access, technical base, commercial context and delivery readiness across the relevant Formats. You see which route deserves the next conversation.</p>
              <strong>SEE HOW THE REVIEW WORKS <ArrowRight aria-hidden="true" /></strong>
            </div>
          </Link>

          <article className={`${styles.propertyOpportunityCard} ${styles.preparedOpportunityCard}`}>
            <div className={styles.propertyOpportunityMedia}>
              <Image src="/assets/images/crays-franchise/prepared-deal-evidence-review-175.jpeg" fill sizes="(max-width: 900px) 100vw, 42vw" alt="A potential operator reviewing a prepared business opportunity with advisers" />
              <span>02 / PREPARED DEALS</span>
            </div>
            <div className={styles.propertyOpportunityBody}>
              <p>PREPARED DEALS</p>
              <h3>A BETTER START FOR THE RIGHT OPERATOR.</h3>
              <p>A released Prepared Deal connects one property, one CRAYS Format and the decision material around it—so a serious candidate can evaluate a real opportunity instead of starting from a blank page.</p>
              <ol className={styles.preparedEvidenceGrid} aria-label="Prepared Deal evidence families">
                <li><span aria-hidden="true">01</span><strong>PROPERTY</strong></li>
                <li><span aria-hidden="true">02</span><strong>MARKET</strong></li>
                <li><span aria-hidden="true">03</span><strong>COMMERCIAL</strong></li>
                <li><span aria-hidden="true">04</span><strong>FINANCIAL</strong></li>
                <li><span aria-hidden="true">05</span><strong>DESIGN</strong></li>
                <li><span aria-hidden="true">06</span><strong>OPENING</strong></li>
              </ol>
              <Link href="/deals" className={styles.propertyOpportunityAction}>
                REVIEW RELEASED OPPORTUNITIES <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </section>

      <PartnerSalesClose />
      <HomeClosing />
    </>
  );
}

function ContinuityDetail() {
  return (
      <section id="continuity" className={styles.evidenceContinuity} aria-labelledby="evidence-continuity-title">
        <div className={styles.evidenceContinuityHero}>
          <div className={styles.evidenceContinuityCopy}>
            <p className={styles.evidenceContinuityLabel}>VALID EVIDENCE CAN REMAIN WITH ITS RECORD</p>
            <h2 id="evidence-continuity-title">WHEN ONE PATH STOPS, VALID WORK CAN STILL HAVE A NEXT ROUTE.</h2>
            <p className={styles.evidenceContinuityIntro}>Your Property Opportunity, Deal Package, Candidate relationship, Funding Case and decisions remain separate. Your still-valid evidence may stay only where lawfully retained with its original record and purpose; it is not automatically current, complete, transferable or public. Every route you take next requires its own applicable approval, consent, scope, release and decision. Nothing reroutes automatically, and no replacement, fit, funding, timing or opening is guaranteed.</p>
          </div>
          <div className={styles.evidenceContinuityMedia}>
            <Image src="/assets/images/crays-franchise/crays-evidence-next-route-user.jpg" fill sizes="(max-width: 900px) 100vw, 54vw" alt="Illustrated path from research and planning to ideas and solutions" />
            <span>INTENDED OPERATING MODEL</span>
          </div>
        </div>

        <ol className={styles.evidenceContinuityList} aria-label="Three evidence-continuity scenarios">
          <li>
            <article className={styles.evidenceContinuityScenario}>
              <header className={styles.continuityScenarioTitle}>
                <span aria-hidden="true">01</span>
                <h3>IF YOU WITHDRAW</h3>
              </header>
              <div className={styles.continuityScenarioFact}>
                <h4>CHANGES</h4>
                <p>Your affected Candidate–Deal Match and its selection state close or change under their own rules.</p>
              </div>
              <div className={styles.continuityScenarioFact}>
                <h4>STAYS WITH ITS RECORD</h4>
                <p>The Property Opportunity, assessment, Deal Package versions and release history remain separate. Your Candidate history stays only where lawfully retained for its own purpose.</p>
              </div>
              <div className={styles.continuityScenarioFact}>
                <h4>NEXT ROUTE</h4>
                <p>You may inspect another released package through a separate relationship decision and release. CRAYS may also open a new, separately approved match for the opportunity. Neither route is automatic or guaranteed; your private evidence does not cross scopes without authority.</p>
              </div>
            </article>
          </li>
          <li>
            <article className={styles.evidenceContinuityScenario}>
              <header className={styles.continuityScenarioTitle}>
                <span aria-hidden="true">02</span>
                <h3>IF YOUR LENDER DECLINES</h3>
              </header>
              <div className={styles.continuityScenarioFact}>
                <h4>CHANGES</h4>
                <p>Your lender’s review closes. Its independent decision, reason and conditions stay specific to that review; your Funding Case changes only under its own workflow.</p>
              </div>
              <div className={styles.continuityScenarioFact}>
                <h4>STAYS WITH ITS RECORD</h4>
                <p>Your Funding Case, Candidate–Deal Match, Candidate relationship, Deal Package, Property Opportunity and prior review history remain separate, subject to lawful retention and access rules.</p>
              </div>
              <div className={styles.continuityScenarioFact}>
                <h4>NEXT ROUTE</h4>
                <p>You can consider another eligible lender only after your applicable approval or consent, relationship authorization and an approved versioned evidence release. Nothing is broadcast or rerouted automatically, and no approval, terms or funding is guaranteed.</p>
              </div>
            </article>
          </li>
          <li>
            <article className={styles.evidenceContinuityScenario}>
              <header className={styles.continuityScenarioTitle}>
                <span aria-hidden="true">03</span>
                <h3>IF A FORMAT DOES NOT FIT YOUR PROPERTY</h3>
              </header>
              <div className={styles.continuityScenarioFact}>
                <h4>CHANGES</h4>
                <p>Only that Property–Format Assessment is rejected or superseded. Your package from an invalid assessment follows its own close or supersede rules.</p>
              </div>
              <div className={styles.continuityScenarioFact}>
                <h4>STAYS WITH ITS RECORD</h4>
                <p>Your Property Opportunity, still-valid source evidence, provenance, other assessments and historical records stay with their own records, subject to lawful retention.</p>
              </div>
              <div className={styles.continuityScenarioFact}>
                <h4>NEXT ROUTE</h4>
                <p>We may assess your property against another relevant Coffee, Retail, Gym or Clubs Format. Nothing starts automatically; your new Deal Package requires that separate assessment’s approval and versioned evidence. Reuse is limited by source, date, scope and validity; no fit or opening is guaranteed.</p>
              </div>
            </article>
          </li>
        </ol>

        <div className={styles.evidenceContinuityBoundary}>
          <div className={styles.evidenceContinuityBoundaryCopy}>
            <p><strong>NO FULL RESET NEVER MEANS NO REWORK.</strong> Expired, property-specific, Candidate-specific, lender-specific or invalid evidence must be refreshed or excluded.</p>
            <p>Designed continuity, not live automation. Public visitors never see the internal relationship graph.</p>
          </div>
          <Action href="/how-it-works">SEE THE COMPLETE PROCESS</Action>
        </div>
      </section>
  );
}

function AssociationEcosystemDetail() {
  return (
      <section
        id="ecosystem"
        className={styles.associationEcosystem}
        aria-labelledby="association-ecosystem-title"
      >
        <div className={styles.associationMasthead}>
          <div className={styles.associationHeading}>
            <p className={styles.associationLabel}>THE CRAYS ASSOCIATION</p>
            <h2 id="association-ecosystem-title">
              GO FURTHER<br />WITH THE RIGHT<br />ECOSYSTEM.
            </h2>
            <p className={styles.associationLead}>
              Physical places, community, technology, governance and capital
              can strengthen the CRAYS journey while each contract, decision
              and permission remains separately governed.
            </p>
            <a className={styles.associationAction} href="https://www.crays.org/" target="_blank" rel="noopener noreferrer">
              EXPLORE THE CRAYS ASSOCIATION <ArrowRight aria-hidden="true" />
            </a>
          </div>
          <div className={styles.associationHeroMedia}>
            <Image src="/assets/images/crays-pro-portal-community-generated.png" fill sizes="(max-width: 900px) 100vw, 58vw" alt="A connected CRAYS community and business environment" />
          </div>
        </div>

        <ol className={styles.associationLayers}>
          <li>
            <span className={styles.associationLayerNumber} aria-hidden="true">01</span>
            <Building2 aria-hidden="true" />
            <h3>PHYSICAL</h3>
            <div className={styles.associationLayerCopy}>
              <span>CONTRIBUTION</span>
              <p>You can contribute your property through a separately reviewed relationship and help make Coffee, Retail, Gym and Clubs tangible in real places.</p>
            </div>
            <div className={styles.associationLayerCopy}>
              <span>BOUNDARY</span>
              <p>Each property and Format still requires its own review and approval; no location, fit or opening is promised.</p>
            </div>
          </li>
          <li>
            <span className={styles.associationLayerNumber} aria-hidden="true">02</span>
            <Handshake aria-hidden="true" />
            <h3>COMMUNITY</h3>
            <div className={styles.associationLayerCopy}>
              <span>CONTRIBUTION</span>
              <p>You can contribute operating capability, specialist delivery, local knowledge or community through your independent relationship.</p>
            </div>
            <div className={styles.associationLayerCopy}>
              <span>BOUNDARY</span>
              <p>Membership creates neither a customer relationship nor marketing consent and grants no supplier work.</p>
            </div>
          </li>
          <li>
            <span className={styles.associationLayerNumber} aria-hidden="true">03</span>
            <Cpu aria-hidden="true" />
            <h3>TECHNOLOGY</h3>
            <div className={styles.associationLayerCopy}>
              <span>CONTRIBUTION</span>
              <p>You can contribute technology through a separately approved relationship. Shared infrastructure connects your structured records, released views and continuity across the CRAYS relationships you choose.</p>
            </div>
            <div className={styles.associationLayerCopy}>
              <span>BOUNDARY</span>
              <p>Nostr may support portable identity and chosen relationship signals; CRAYS Core permissions, explicit consent, suppression and organization, location and Venture scope remain authoritative.</p>
            </div>
          </li>
          <li>
            <span className={styles.associationLayerNumber} aria-hidden="true">04</span>
            <ShieldCheck aria-hidden="true" />
            <h3>GOVERNANCE</h3>
            <div className={styles.associationLayerCopy}>
              <span>CONTRIBUTION</span>
              <p>The Association is intended to govern shared brand and community infrastructure and a cost-efficient support path for Franchise Partner marketing.</p>
            </div>
            <div className={styles.associationLayerCopy}>
              <span>BOUNDARY</span>
              <p>Each campaign, customer relationship and permission remains separate. Membership grants no Franchise, brand-use, voting, token, tax, legal-class or Portal right.</p>
            </div>
          </li>
          <li>
            <span className={styles.associationLayerNumber} aria-hidden="true">05</span>
            <BarChart3 aria-hidden="true" />
            <h3>CAPITAL</h3>
            <div className={styles.associationLayerCopy}>
              <span>CONTRIBUTION</span>
              <p>Funding and investment relationships remain separately scoped and independently decided.</p>
            </div>
            <div className={styles.associationLayerCopy}>
              <span>BOUNDARY</span>
              <p>Association membership grants no offer, capital access, funding, investment approval or return.</p>
            </div>
          </li>
        </ol>

        <div className={styles.associationBoundary}>
          <div>
            <p>Association membership does not submit a property, register Franchise interest, qualify a Funding Partner, create an Investor or Vendor relationship, or authorize Portal records.</p>
            <p>Each CRAYS.pro path starts separately and keeps its own review, agreement and access scope. Property and Franchise actions stay on CRAYS.pro; Association membership continues at crays.org.</p>
          </div>
          <a
            className={styles.associationAction}
            href="https://www.crays.org/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="A MEMBER OF THE CRAYS ASSOCIATION (opens in a new tab)"
          >
            A MEMBER OF THE CRAYS ASSOCIATION
          </a>
        </div>
      </section>
  );
}

function ConceptGrid() {
  return (
    <section className={styles.concepts}>
      <div className={styles.sectionHead}>
        <div><p className={styles.eyebrow}>THE CRAYS PORTFOLIO</p><h2>ONE NETWORK.<br />FOUR FORMATS.</h2></div>
        <p>A broader portfolio means a property can be assessed for more than one operating model.</p>
      </div>
      <div className={styles.conceptGrid}>
        {concepts.map((concept, i) => (
          <Link href={`${root}/concepts/${concept.key}`} key={concept.key} className={styles.conceptCard}>
            <Image src={concept.image} fill sizes="(max-width: 700px) 100vw, 25vw" alt={`${concept.name} concept`} />
            <div className={styles.conceptShade} />
            <div className={styles.conceptContent}>
              <span className={styles.equityBadge}>OWN CAPITAL FROM <strong>{concept.equity}</strong></span>
              <span className={styles.conceptNumber}>0{i + 1}</span>
              <h3>{concept.name}</h3>
              <p>{concept.label}</p>
              <ArrowRight />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DealPage() {
  return (
    <>
      <GenericHero copy={pageCopy.deals} image="/assets/images/deals-place-commercial-building-pexels-7541122.jpg" />
      <section className={styles.emptyDeals}>
        <div><span>MARKETPLACE STATUS</span><h2>NO PUBLIC DEALS HAVE BEEN RELEASED YET.</h2></div>
        <div><p>CRAYS only publishes an opportunity when its public discovery record is ready. Private property, candidate, financial and diligence evidence remains inside the governed workspace.</p><Action href="/account/create/continue/candidate">REGISTER YOUR INTEREST</Action></div>
      </section>
      <section className={styles.package}>
        <p className={styles.eyebrow}>WHAT A RELEASED PACKAGE CAN ORGANIZE</p>
        {["LOCATION & PROPERTY", "CONCEPT FIT", "OPERATING CASE", "CAPITAL REQUIREMENT", "SCENARIOS & RISKS", "DELIVERY READINESS"].map((x, i) => <div key={x}><span>0{i + 1}</span><h3>{x}</h3><ArrowRight /></div>)}
      </section>
    </>
  );
}

function GenericHero({ copy, image }: { copy: { eyebrow: string; title: string; intro: string }; image: string }) {
  return (
    <section className={styles.pageHero}>
      <div><p className={styles.eyebrow}>{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.intro}</p></div>
      <div><Image src={image} fill priority sizes="(max-width: 900px) 100vw, 48vw" alt="" /></div>
    </section>
  );
}

function ConceptsOverview() {
  return (
    <div className={styles.conceptsOverview}>
      <section
        className={styles.conceptsOverviewHero}
        aria-labelledby="concepts-overview-title"
      >
        <div className={styles.conceptsOverviewHeroCopy}>
          <p className={styles.conceptsOverviewEyebrow}>CHOOSE YOUR CRAYS VENTURE</p>
          <h1 id="concepts-overview-title">
            FOUR VENTURES.
            <br />
            FIND THE BUSINESS THAT FITS YOU.
          </h1>
          <p>
            Compare the entry indicators, property direction and operating
            responsibility of each Venture. Choose the customer experience you
            want to lead, then continue your Franchise route through CRAYS.pro.
          </p>
        </div>
        <div
          className={styles.conceptsOverviewMosaic}
          aria-label="Coffee, Retail, Gym and Clubs"
        >
          {conceptOverviewComparison.map((concept) => (
            <div className={styles.conceptsOverviewMosaicImage} key={concept.key}>
              <Image
                src={concept.image}
                fill
                priority
                sizes="(max-width: 900px) 50vw, 28vw"
                style={{ objectPosition: concept.crop }}
                alt={concept.alt}
              />
              <span>{concept.venture}</span>
            </div>
          ))}
        </div>
      </section>

      <section
        className={styles.conceptsOverviewGuide}
        aria-labelledby="concepts-comparison-guide-title"
      >
        <div>
          <p className={styles.conceptsOverviewEyebrow}>YOUR COMPARISON</p>
          <h2 id="concepts-comparison-guide-title">
            USE THE SAME SEVEN QUESTIONS FOR EVERY VENTURE.
          </h2>
        </div>
        <div>
          <p>
            Use “starting with” and “own capital from” to orient your comparison.
            They are not your total investment or guarantees of property
            acceptance, Franchise award, financing, return or opening.
          </p>
          <p>
            Use CRAYS.pro for your Franchise and shared B2B journey. Each login,
            Portal view and SaaS capability remains available only when it is
            released for your approved relationship and scope.
          </p>
        </div>
      </section>

      <section
        className={styles.conceptsComparison}
        aria-label="Four-Venture comparison"
      >
        {conceptOverviewComparison.map((concept) => {
          const titleId = `concept-overview-${concept.key}`;
          return (
            <article
              className={styles.conceptComparisonRow}
              key={concept.key}
              aria-labelledby={titleId}
            >
              <div className={styles.conceptComparisonMedia}>
                <Image
                  src={concept.image}
                  fill
                  sizes="(max-width: 900px) 100vw, 43vw"
                  style={{ objectPosition: concept.crop }}
                  alt={concept.alt}
                />
                <div className={styles.conceptComparisonBadges}>
                  <span>{concept.equity}</span>
                  <span>{concept.minimumArea}</span>
                </div>
              </div>

              <div className={styles.conceptComparisonCopy}>
                <header>
                  <span>{concept.index}</span>
                  <div>
                    <p>VENTURE</p>
                    <h2 id={titleId}>{concept.venture}</h2>
                    <p>{concept.descriptor}</p>
                  </div>
                </header>

                <dl>
                  <div>
                    <dt>MINIMUM AREA</dt>
                    <dd>{concept.minimumArea}</dd>
                  </div>
                  <div>
                    <dt>EQUITY</dt>
                    <dd>{concept.equity}</dd>
                  </div>
                  <div>
                    <dt>PROPERTY PATTERN</dt>
                    <dd>{concept.propertyPattern}</dd>
                  </div>
                  <div>
                    <dt>OPERATING CORE</dt>
                    <dd>{concept.operatingCore}</dd>
                  </div>
                  <div>
                    <dt>CUSTOMER FRONTEND / DOMAIN</dt>
                    <dd>
                      <a
                        href={concept.customerHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${concept.customerDomain} — opens in a new tab`}
                      >
                        {concept.customerDomain}
                      </a>
                      <span>{concept.customerContext}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>SHARED HOSTING AUTHORITY</dt>
                    <dd>{concept.sharedAuthority}</dd>
                  </div>
                </dl>

                <div className={styles.conceptComparisonActions}>
                  <Link
                    className={styles.conceptDetailLink}
                    href={`/concepts/${concept.key}`}
                  >
                    EXPLORE {concept.venture}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                  <a
                    className={styles.conceptCustomerLink}
                    href={concept.customerHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${concept.venture} customer experience — opens in a new tab`}
                  >
                    VISIT {concept.venture}
                    <ArrowRight aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function ConceptPage({ keyName }: { keyName: string }) {
  return <LegacyConceptPage keyName={keyName} />;
}

const coffeePropertyReview = [
  "Frontage, visibility, access and local customer movement.",
  "Counter, queue, preparation and pickup flow.",
  "Power, water, drainage, ventilation where required, storage, deliveries and waste.",
  "Accessible entry, staff-support needs, permissions and local demand.",
];

const coffeeOperatingCore = [
  {
    name: "OFFER",
    copy:
      "A concise, beverage-led range defined by the released Format and local approvals. Exact menu and pricing remain to be confirmed.",
  },
  {
    name: "FLOW",
    copy:
      "A planned order, preparation and pickup sequence sized to the property. Speed is measured, not promised.",
  },
  {
    name: "DIGITAL",
    copy:
      "Planned ordering, payment and loyalty touchpoints for the Coffee customer journey. Exact released features remain to be confirmed.",
  },
  {
    name: "CONTROL",
    copy:
      "Released routines will govern quality, hygiene, stock, waste, opening and close; reviewed site-level signals will support operating control. Exact standards remain to be confirmed.",
  },
];

function CoffeeConceptPage() {
  return (
    <div className={styles.coffeeDetail}>
      <section
        className={styles.coffeeDetailHero}
        aria-labelledby="coffee-detail-title"
      >
        <div className={styles.coffeeDetailMedia}>
          <Image
            src="/assets/images/crays-franchise/concepts/crays-coffee-customer.jpg"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 52vw"
            style={{ objectPosition: "50% 50%" }}
            alt="Coffee customer holding a takeaway cup and phone"
          />
          <div className={styles.coffeeDetailBadges} aria-label="Public orientation indicators">
            <span>STARTING WITH 25 m²</span>
            <span>OWN CAPITAL FROM €10K</span>
          </div>
        </div>

        <div className={styles.coffeeDetailHeroCopy}>
          <Link className={styles.coffeeBackLink} href="/concepts">
            <ArrowRight aria-hidden="true" />
            ALL CONCEPTS
          </Link>
          <p className={styles.coffeeDetailEyebrow}>CRAYS COFFEE / COMPACT FORMAT</p>
          <h1 id="coffee-detail-title">
            COMPACT BY DESIGN.
            <br />
            QUICK THROUGH CLEAR FLOW.
          </h1>
          <p className={styles.coffeeDetailLead}>
            Choose CRAYS Coffee if you want to operate a design-led hospitality
            business in a compact place, with a focused offer, direct service
            rhythm and planned digital ordering and loyalty.
          </p>
          <p className={styles.coffeeCommercialQualifier}>
            Starting with 25 m² and own capital from €10K are public orientation
            indicators only. They are not total investment, sufficient funding,
            property approval, Franchise award, return or opening guarantees.
            Final requirements depend on the reviewed property, Format and
            released Deal Package.
          </p>
        </div>
      </section>

      <section className={styles.coffeeFormat} aria-labelledby="coffee-format-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>THE FORMAT</p>
          <h2 id="coffee-format-title">A SMALL FOOTPRINT WITH A CLEAR DAILY RHYTHM.</h2>
        </div>
        <p>
          Give your customers one readable sequence: choose, order and collect.
          You work with an intentional environment and a measurable operating
          case. Speed remains your workflow target, never a guaranteed service
          time.
        </p>
      </section>

      <section className={styles.coffeeProperty} aria-labelledby="coffee-property-title">
        <div className={styles.coffeePropertyIntro}>
          <p className={styles.coffeeDetailEyebrow}>PROPERTY FIT</p>
          <h2 id="coffee-property-title">
            SPACE IS THE STARTING POINT. FLOW DECIDES THE FIT.
          </h2>
          <p>
            Use 25 m² as your starting orientation, not as site approval. We
            review how your complete Coffee operation could work in the specific
            property.
          </p>
        </div>
        <div className={styles.coffeePropertyList}>
          {coffeePropertyReview.map((item, index) => (
            <p key={item}>
              <span>0{index + 1}</span>
              {item}
            </p>
          ))}
          <p className={styles.coffeePropertyBoundary}>
            Seating or a terrace is optional only where the released Format,
            property and permissions support it. Area alone never determines
            fit.
          </p>
        </div>
      </section>

      <section className={styles.coffeeCandidate} aria-labelledby="coffee-candidate-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>YOUR OPERATING FIT</p>
          <h2 id="coffee-candidate-title">HANDS-ON HOSPITALITY. CONSISTENT EXECUTION.</h2>
        </div>
        <p>
          This Venture may fit you if you can lead people, protect released
          product and service standards, follow the food-safety and compliance
          routines for your Format, use approved customer tools and build local
          relationships. Your qualification and Deal review remain separate;
          registration alone grants no Franchise, Deal access or opening.
        </p>
      </section>

      <section className={styles.coffeeOperating} aria-labelledby="coffee-operating-title">
        <header>
          <p className={styles.coffeeDetailEyebrow}>OPERATING CORE</p>
          <h2 id="coffee-operating-title">
            FOCUSED OFFER. DIRECT SERVICE. DESIGNED FOR REPEATABILITY.
          </h2>
        </header>
        <div>
          {coffeeOperatingCore.map((pillar, index) => (
            <article key={pillar.name}>
              <span>0{index + 1}</span>
              <h3>{pillar.name}</h3>
              <p>{pillar.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.coffeeCustomer} aria-labelledby="coffee-customer-title">
        <div className={styles.coffeeCustomerMedia}>
          <Image
            src="/assets/images/crays-franchise/concepts/crays-coffee-customer.jpg"
            fill
            sizes="(max-width: 900px) 100vw, 42vw"
            style={{ objectPosition: "50% 70%" }}
            alt=""
          />
        </div>
        <div className={styles.coffeeCustomerCopy}>
          <p className={styles.coffeeDetailEyebrow}>CUSTOMER EXPERIENCE</p>
          <h2 id="coffee-customer-title">YOUR CUSTOMERS CONTINUE WITH CRAYS COFFEE.</h2>
          <p>
            www.crays.coffee remains the distinct Coffee customer destination.
            This CRAYS.pro page describes the Franchise opportunity and does not
            change the current Coffee frontend.
          </p>
          <a
            className={styles.coffeeSecondaryAction}
            href="https://www.crays.coffee/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit CRAYS Coffee customer experience — opens in a new tab"
          >
            VISIT CRAYS COFFEE
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className={styles.coffeeFranchise} aria-labelledby="coffee-franchise-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>FRANCHISE &amp; PROPERTY</p>
          <h2 id="coffee-franchise-title">
            START WITH THE PLACE — OR A RELEASED OPPORTUNITY.
          </h2>
        </div>
        <div>
          <p>
            Introduce a compact property or explore released CRAYS Coffee Deals
            through CRAYS.pro. Registration records interest; it does not award
            a Franchise, approve funding or guarantee an opening.
          </p>
          <div className={styles.coffeeFranchiseActions}>
            <Link className={styles.coffeePrimaryAction} href="/real-estate#submit-property">
              INTRODUCE YOUR PROPERTY
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={styles.coffeeSecondaryAction} href="/deals">
              REVIEW RELEASED OPPORTUNITIES
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.coffeeAuthorityNote}>
            Use CRAYS.pro for your Franchise acquisition, Shared Login,
            stakeholder Portal and released shared SaaS capabilities. Your
            Coffee customer experience remains at www.crays.coffee.
          </p>
        </div>
      </section>
    </div>
  );
}

const retailPropertyDefinition = [
  "Final property pattern and complete fit criteria.",
  "Frontage, visibility, access and local-demand requirements.",
  "Logistics, storage, deliveries, waste and fulfilment requirements.",
  "Utilities, technical services, planning and other site-specific thresholds.",
];

const retailOperatingDefinition = [
  {
    name: "ASSORTMENT / TBD",
    copy:
      "No product categories, range, brands, sourcing model or availability promise is approved for publication.",
  },
  {
    name: "AUTOMATION / TBD",
    copy:
      "No checkout, vending, robotics, inventory or staffing-automation model is approved for publication.",
  },
  {
    name: "COMMERCE & FULFILMENT / TBD",
    copy:
      "No store, ordering, click-and-collect, delivery, omnichannel, logistics or fulfilment model is approved for publication.",
  },
  {
    name: "CUSTOMER EXPERIENCE & LOYALTY / TBD",
    copy:
      "No Retail account, membership, wallet, rewards, app or cross-Venture benefit is approved for publication.",
  },
  {
    name: "FORMAT ECONOMICS / TBD",
    copy:
      "No total investment, capex, opex, revenue, margin, staffing, throughput, breakeven, payback, return or profitability claim is approved.",
  },
];

function RetailConceptPage() {
  return (
    <div className={`${styles.coffeeDetail} ${styles.retailDetail}`}>
      <section
        className={styles.coffeeDetailHero}
        aria-labelledby="retail-detail-title"
      >
        <div className={styles.coffeeDetailMedia}>
          <Image
            src="/assets/images/crays-franchise/concepts/crays-retail-customer.jpg"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 52vw"
            style={{ objectPosition: "50% 50%" }}
            alt="Retail customer holding a payment card and shopping bags"
          />
          <div className={styles.coffeeDetailBadges} aria-label="Public orientation indicators">
            <span>STARTING WITH 100 m²</span>
            <span>OWN CAPITAL FROM €25K</span>
          </div>
        </div>

        <div className={styles.coffeeDetailHeroCopy}>
          <Link className={styles.coffeeBackLink} href="/concepts">
            <ArrowRight aria-hidden="true" />
            ALL CONCEPTS
          </Link>
          <p className={styles.coffeeDetailEyebrow}>
            CRAYS RETAIL / DEFINITION IN DEVELOPMENT
          </p>
          <h1 id="retail-detail-title">
            THE VENTURE IS CONFIRMED.
            <br />
            THE FORMAT IS STILL BEING DEFINED.
          </h1>
          <p className={styles.coffeeDetailLead}>
            Explore CRAYS Retail as a distinct Venture still in format
            definition. You can use its public space and equity indicators for
            orientation; you cannot yet evaluate a released assortment,
            operating model, customer experience or set of economics.
          </p>
          <p className={styles.coffeeCommercialQualifier}>
            Starting with 100 m² and own capital from €25K are public orientation
            indicators only. They are not total investment, sufficient funding,
            property approval, Franchise award, return or opening guarantees.
            Final requirements depend on a released Retail Format, the reviewed
            property and the applicable Deal Package.
          </p>
        </div>
      </section>

      <section className={styles.coffeeFormat} aria-labelledby="retail-format-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>FORMAT STATUS</p>
          <h2 id="retail-format-title">
            A RETAIL DIRECTION — NOT A RELEASED OPERATING MODEL.
          </h2>
        </div>
        <p>
          You can rely on the Venture, its two public orientation indicators and
          the decision to build your Retail route directly into the common CRAYS
          platform. You cannot yet rely on a final Retail Format. Assortment,
          automation, commerce, fulfilment, customer experience, operating
          standards and economics remain in definition.
        </p>
      </section>

      <section className={styles.coffeeProperty} aria-labelledby="retail-property-title">
        <div className={styles.coffeePropertyIntro}>
          <p className={styles.coffeeDetailEyebrow}>PROPERTY FIT</p>
          <h2 id="retail-property-title">
            100 m² IS AN ORIENTATION — NOT A SITE DEFINITION.
          </h2>
          <p>
            Use 100 m² as your public starting point. You can introduce a
            property you own or represent for CRAYS multi-format review.
          </p>
        </div>
        <div className={styles.coffeePropertyList}>
          {retailPropertyDefinition.map((item, index) => (
            <p key={item}>
              <span>0{index + 1} / TBD</span>
              {item}
            </p>
          ))}
          <p className={styles.coffeePropertyBoundary}>
            Area alone never determines Retail fit. A property introduction
            records an opportunity for review; it does not approve a Retail
            Format, Deal or opening.
          </p>
        </div>
      </section>

      <section className={styles.coffeeCandidate} aria-labelledby="retail-candidate-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>YOUR OPERATING FIT</p>
          <h2 id="retail-candidate-title">
            INTEREST MAY BE RECORDED. FINAL QUALIFICATION REMAINS TBD.
          </h2>
        </div>
        <p>
          You cannot yet assess a final Retail operator profile, experience
          threshold, staffing model, training requirement or qualification:
          these remain TBD until the Retail Format is released. You can explore
          publicly released CRAYS opportunities. Where your governed journey is
          available, registration records your interest only; it grants no
          Franchise, Deal access, funding, territory or opening.
        </p>
      </section>

      <section className={styles.coffeeOperating} aria-labelledby="retail-operating-title">
        <header>
          <p className={styles.coffeeDetailEyebrow}>OPERATING CORE</p>
          <h2 id="retail-operating-title">THE OPERATING CORE REMAINS TBD.</h2>
        </header>
        <div>
          {retailOperatingDefinition.map((field, index) => (
            <article key={field.name}>
              <span>0{index + 1}</span>
              <h3>{field.name}</h3>
              <p>{field.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.coffeeCustomer} aria-labelledby="retail-customer-title">
        <div className={styles.coffeeCustomerMedia}>
          <Image
            src="/assets/images/crays-franchise/concepts/crays-retail-customer.jpg"
            fill
            sizes="(max-width: 900px) 100vw, 42vw"
            style={{ objectPosition: "50% 50%" }}
            alt=""
          />
        </div>
        <div className={styles.coffeeCustomerCopy}>
          <p className={styles.coffeeDetailEyebrow}>CUSTOMER EXPERIENCE</p>
          <h2 id="retail-customer-title">YOUR CRAYS STORE CUSTOMER DESTINATION IS LIVE.</h2>
          <p>
            Visit CRAYS Store to explore the live Retail customer experience at
            www.crays.shop. Your Franchise, property and shared platform journey
            remains here on CRAYS.pro.
          </p>
          <a
            className={styles.retailCustomerStatus}
            href="https://www.crays.shop/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>VISIT CRAYS STORE</strong>
            <span>
              WWW.CRAYS.SHOP
              <ArrowRight aria-hidden="true" />
            </span>
          </a>
        </div>
      </section>

      <section className={styles.coffeeFranchise} aria-labelledby="retail-franchise-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>FRANCHISE &amp; PROPERTY</p>
          <h2 id="retail-franchise-title">
            START WITH A PROPERTY — OR A RELEASED CRAYS OPPORTUNITY.
          </h2>
        </div>
        <div>
          <p>
            Introduce a property for multi-format review or explore only the
            Deals CRAYS has released publicly. Neither action confirms Retail
            fit, Format release, Candidate qualification, funding or an opening.
          </p>
          <div className={styles.coffeeFranchiseActions}>
            <Link className={styles.coffeePrimaryAction} href="/real-estate#submit-property">
              INTRODUCE YOUR PROPERTY
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={styles.coffeeSecondaryAction} href="/deals">
              REVIEW RELEASED OPPORTUNITIES
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.coffeeAuthorityNote}>
            Use CRAYS.pro for your Retail Franchise, property, Shared Login,
            stakeholder Portal and released shared SaaS journey. The live Retail
            customer experience is available separately at www.crays.shop.
          </p>
        </div>
      </section>
    </div>
  );
}

function LegacyConceptPage({ keyName }: { keyName: string }) {
  const concept = concepts.find((x) => x.key === keyName);
  if (!concept) return null;
  const operatingFocus: Record<string, string[]> = {
    coffee: ["Ordering & service", "Wallet & loyalty", "Store operations", "Local community"],
    retail: ["Assortment", "Inventory", "Commerce", "Fulfillment & loyalty"],
    gym: ["Membership", "Training & booking", "Access", "Studio operations"],
    clubs: ["Membership", "Rooms & booking", "Events", "Hospitality"],
  };
  return (
    <>
      <GenericHero copy={{ eyebrow: "ONE OF FOUR CONNECTED CONCEPTS", title: concept.name, intro: concept.description }} image={concept.image} />
      <section className={styles.conceptInvestment}>
        <p>INDICATIVE OWN CAPITAL</p>
        <strong>FROM {concept.equity}</strong>
        <span>Final capital needs depend on the released location, structure, funding and approved deal package.</span>
      </section>
      <section className={styles.fitSection}><div><p className={styles.eyebrow}>PROPERTY DIRECTION</p><h2>WHERE THIS FORMAT CAN FIT.</h2></div><div>{concept.fit.map((x, i) => <p key={x}><span>0{i + 1}</span>{x}</p>)}</div></section>
      <section className={styles.operatingFocus}>
        <div><p className={styles.eyebrow}>CONCEPT OPERATING FOCUS</p><h2>ONE CORE.<br />A DISTINCT CUSTOMER EXPERIENCE.</h2></div>
        <div>{operatingFocus[concept.key].map((item, index) => <article key={item}><span>0{index + 1}</span><h3>{item}</h3></article>)}</div>
      </section>
      <section className={styles.nextConcept}><p>ASSESS A PROPERTY ACROSS ALL FOUR FORMATS.</p><Action href={`${root}/property-owners/submit`}>INTRODUCE A PROPERTY</Action></section>
    </>
  );
}

const gymPropertyReview = [
  "Can the site support a usable training floor and clear member, staff and operational movement?",
  "What do frontage, visibility, access, surrounding demand and catchment evidence show?",
  "Which technical services, building constraints, permissions and planning route apply to the intended Gym Format?",
  "Does the complete reviewed evidence support the intended released Gym Format, and what remains unresolved before any Deal Package can be prepared?",
];

const gymOperatingCore = [
  {
    name: "MEMBERSHIP",
    copy:
      "Membership frames the ongoing Gym relationship and its lifecycle. Exact offers, routines and capabilities depend on what is released for the Gym Format.",
  },
  {
    name: "TRAINING & BOOKING",
    copy:
      "Training and booking organize the Gym member journey through only the experiences and workflows released for the applicable Format.",
  },
  {
    name: "ACCESS",
    copy:
      "Access belongs to the Gym member and venue operation and remains subject to released controls and site-specific requirements.",
  },
  {
    name: "STUDIO / GYM OPERATIONS",
    copy:
      "Day-to-day Gym responsibilities follow the standards, roles and evidence released for the operating location and applicable Format.",
  },
];

function GymConceptPage() {
  return (
    <div className={`${styles.coffeeDetail} ${styles.gymDetail}`}>
      <section
        className={styles.coffeeDetailHero}
        aria-labelledby="gym-detail-title"
      >
        <div className={styles.coffeeDetailMedia}>
          <Image
            src="/assets/images/crays-franchise/concepts/crays-gym-performance.jpg"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 52vw"
            style={{ objectPosition: "50% 45%" }}
            alt="CRAYS Gym athlete training in a performance space"
          />
          <div
            className={styles.coffeeDetailBadges}
            aria-label="Public orientation indicators"
          >
            <span>STARTING WITH 500 m²</span>
            <span>OWN CAPITAL FROM €50K</span>
          </div>
        </div>

        <div className={styles.coffeeDetailHeroCopy}>
          <Link className={styles.coffeeBackLink} href="/concepts">
            <ArrowRight aria-hidden="true" />
            ALL CONCEPTS
          </Link>
          <p className={styles.coffeeDetailEyebrow}>
            CRAYS GYM / TECHNOLOGY-LED PERFORMANCE FORMAT
          </p>
          <h1 id="gym-detail-title">
            PERFORMANCE IN THE SPACE.
            <br />
            CONTROL IN THE DAILY RHYTHM.
          </h1>
          <p className={styles.coffeeDetailLead}>
            Choose CRAYS Gym if you want to lead a performance-space business
            that connects a training-led member experience with membership,
            booking, access and Gym operations. Technology supports the
            workflows released for your Gym Format; it does not replace you or
            prove your property, operating or commercial fit.
          </p>
          <p className={styles.coffeeCommercialQualifier}>
            Starting with 500 m² and own capital from €50K are public orientation
            indicators only. They are not total investment, sufficient funding,
            property approval, Franchise award, return or opening guarantees.
            Final requirements depend on the released Gym Format, the reviewed
            property and the applicable Deal Package.
          </p>
        </div>
      </section>

      <section className={styles.coffeeFormat} aria-labelledby="gym-format-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>THE FORMAT</p>
          <h2 id="gym-format-title">
            A PERFORMANCE SPACE WITH A CONNECTED MEMBER JOURNEY.
          </h2>
        </div>
        <p>
          Build your Gym proposition around a training-led customer experience
          and an operating rhythm supported by released member and venue
          workflows. You receive technology and governed workflows only where
          they are released for your Format; capability maturity and site
          requirements remain release- and Format-specific.
        </p>
      </section>

      <section className={styles.coffeeProperty} aria-labelledby="gym-property-title">
        <div className={styles.coffeePropertyIntro}>
          <p className={styles.coffeeDetailEyebrow}>PROPERTY FIT</p>
          <h2 id="gym-property-title">
            THE TRAINING FLOOR STARTS THE QUESTION. THE COMPLETE SITE SHAPES THE
            REVIEW.
          </h2>
          <p>
            Use 500 m² as your starting orientation, not as an approval rule. We
            review your Gym fit against the intended Format, the complete
            property and the evidence available for your opportunity.
          </p>
        </div>
        <div className={styles.coffeePropertyList}>
          {gymPropertyReview.map((item, index) => (
            <p key={item}>
              <span>0{index + 1}</span>
              {item}
            </p>
          ))}
          <p className={styles.coffeePropertyBoundary}>
            Area alone never determines Gym fit. A property introduction records
            an opportunity for review; it does not approve a Format, Deal, lease,
            funding or opening.
          </p>
        </div>
      </section>

      <section className={styles.coffeeCandidate} aria-labelledby="gym-candidate-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>YOUR OPERATING FIT</p>
          <h2 id="gym-candidate-title">
            LEAD THE GYM. FOLLOW THE RELEASED SYSTEM.
          </h2>
        </div>
        <p>
          CRAYS Gym may fit you if your ambition, geography, property context,
          own-capital readiness and capability align with the released Gym
          system. Your exact experience, training and qualification requirements
          depend on the released Gym Format and applicable Deal Package.
          Browsing or registration grants you no Franchise, Deal access, funding,
          territory or opening.
        </p>
      </section>

      <section className={styles.coffeeOperating} aria-labelledby="gym-operating-title">
        <header>
          <p className={styles.coffeeDetailEyebrow}>OPERATING CORE</p>
          <h2 id="gym-operating-title">
            THE MEMBER JOURNEY SHAPES THE OPERATING CORE.
          </h2>
        </header>
        <div>
          {gymOperatingCore.map((field, index) => (
            <article key={field.name}>
              <span>0{index + 1}</span>
              <h3>{field.name}</h3>
              <p>{field.copy}</p>
            </article>
          ))}
        </div>
        <p className={styles.gymCapabilityBoundary}>
          These four fields describe the Gym operating context. They do not state
          that every feature is live, integrated, equally mature, automated or
          available at every location.
        </p>
      </section>

      <section className={styles.coffeeCustomer} aria-labelledby="gym-customer-title">
        <div className={styles.coffeeCustomerMedia}>
          <Image
            src="/assets/images/crays-franchise/concepts/crays-gym-performance.jpg"
            fill
            sizes="(max-width: 900px) 100vw, 42vw"
            style={{ objectPosition: "50% 45%" }}
            alt=""
          />
        </div>
        <div className={styles.coffeeCustomerCopy}>
          <p className={styles.coffeeDetailEyebrow}>GYM MEMBER EXPERIENCE</p>
          <h2 id="gym-customer-title">
            YOUR MEMBERS CONTINUE WITH CRAYS GYM.
          </h2>
          <p>
            The Gym member and customer experience remains with CRAYS Gym at
            www.craysgym.com. This CRAYS.pro page explains the Franchise
            opportunity and does not replace or redesign the Gym customer
            frontend.
          </p>
          <a
            className={styles.coffeeSecondaryAction}
            href="https://www.craysgym.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit CRAYS Gym member and customer experience — opens in a new tab"
          >
            VISIT CRAYS GYM
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className={styles.coffeeFranchise} aria-labelledby="gym-franchise-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>FRANCHISE &amp; PROPERTY</p>
          <h2 id="gym-franchise-title">
            START WITH A PROPERTY — OR A RELEASED CRAYS OPPORTUNITY.
          </h2>
        </div>
        <div>
          <p>
            Introduce a property for multi-format review or explore only the
            Deals CRAYS has released publicly. Neither action confirms Gym fit,
            Candidate qualification, funding, Franchise award or an opening.
          </p>
          <div className={styles.coffeeFranchiseActions}>
            <Link className={styles.coffeePrimaryAction} href="/real-estate#submit-property">
              INTRODUCE YOUR PROPERTY
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={styles.coffeeSecondaryAction} href="/deals">
              REVIEW RELEASED OPPORTUNITIES
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.coffeeAuthorityNote}>
            CRAYS Gym remains the member and customer experience at
            www.craysgym.com. Use CRAYS.pro for your Franchise acquisition,
            Shared Login, stakeholder Portal and released shared SaaS
            capabilities. CRM, ERP, project and Deal views remain limited to
            what is released for your approved relationship and role.
          </p>
        </div>
      </section>
    </div>
  );
}

/*
 * The completed Task-88 regression verifier closes its Gym source window at
 * the next `function LoginPage(` marker. Keep that historical boundary before
 * the later Task-90 Clubs block so the Gym and Clubs assertions stay atomic.
 */
const clubsPropertyReview = [
  "How can the building character, usable spatial structure and mixed-use context support the intended Clubs Format?",
  "Can arrival, access and guest, member, staff and service movement work together across the proposed spaces?",
  "Which technical, acoustic, fire/life-safety, servicing, permission and planning questions apply to the intended Rooms, Events and Hospitality mix?",
  "What does the available local and property evidence support, and what remains unresolved before any Deal Package can be prepared?",
];

const clubsOperatingCore = [
  {
    name: "MEMBERSHIP",
    copy:
      "Membership frames the Clubs guest relationship and access context only where released for the applicable Format. Exact offers, prices, benefits and rights are not defined here.",
  },
  {
    name: "BOOKING",
    copy:
      "Booking organizes requests or reservations only for services released by the applicable Clubs Format. It does not prove live inventory, real-time availability, payment or automated allocation.",
  },
  {
    name: "ROOMS",
    copy:
      "Rooms describe the stay and room-operating context only where the released Format includes it. No room count, category, rate, occupancy, licence or availability is promised.",
  },
  {
    name: "EVENTS",
    copy:
      "Events describe governed venue programming and delivery only where released for the applicable Format. No calendar, attendance, demand, volume or permanent party programme is claimed.",
  },
  {
    name: "HOSPITALITY",
    copy:
      "Hospitality connects guest service, venue operation and the daily work/live/play rhythm. Actual service levels, staffing, F&B, health, retail and operating hours remain Format- and site-specific.",
  },
];

function ClubsConceptPage() {
  return (
    <div className={`${styles.coffeeDetail} ${styles.clubsDetail}`}>
      <section
        className={styles.coffeeDetailHero}
        aria-labelledby="clubs-detail-title"
      >
        <div className={styles.coffeeDetailMedia}>
          <Image
            src="/assets/images/crays-franchise/concepts/crays-coffee-coworking.jpg"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 54vw"
            style={{ objectPosition: "50% 50%" }}
            alt="Premium CRAYS Clubs hospitality lounge"
          />
          <div
            className={styles.coffeeDetailBadges}
            aria-label="Public orientation indicators"
          >
            <span>STARTING WITH 1,000 m²</span>
            <span>OWN CAPITAL FROM €500K</span>
          </div>
        </div>

        <div className={styles.coffeeDetailHeroCopy}>
          <Link className={styles.coffeeBackLink} href="/concepts">
            <ArrowRight aria-hidden="true" />
            ALL CONCEPTS
          </Link>
          <p className={styles.coffeeDetailEyebrow}>
            CRAYS CLUBS / PREMIUM HOSPITALITY FORMAT
          </p>
          <h1 id="clubs-detail-title">
            HOSPITALITY FOR THE WHOLE DAY.
            <br />
            WORK. STAY. GATHER.
          </h1>
          <p className={styles.coffeeDetailLead}>
            Choose CRAYS Clubs if you want to lead a premium hospitality business
            that brings work, live and play into one property-led operating
            context through Membership, Booking, Rooms, Events and Hospitality.
            Your exact mix, service model and released capabilities depend on
            the Clubs Format, property and applicable Deal Package.
          </p>
          <p className={styles.coffeeCommercialQualifier}>
            Starting with 1,000 m² and own capital from €500K are public
            orientation indicators only. They are not total investment,
            sufficient funding, property approval, Franchise award, occupancy,
            revenue, return, payback or opening guarantees. Final requirements
            depend on the released Clubs Format, the reviewed property and the
            applicable Deal Package.
          </p>
        </div>
      </section>

      <section className={styles.coffeeFormat} aria-labelledby="clubs-format-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>THE FORMAT</p>
          <h2 id="clubs-format-title">ONE PLACE. MORE THAN ONE DAILY RHYTHM.</h2>
        </div>
        <p>
          Create a connected hospitality environment where focus, meetings,
          stays, hosted moments and guest service can work together.
          Work/live/play describes the range you can evaluate—not a promise that
          every location is a hotel, coworking venue, wellness club, nightlife
          destination or full-service resort. Your released Format determines
          the actual mix.
        </p>
      </section>

      <section className={styles.coffeeProperty} aria-labelledby="clubs-property-title">
        <div className={styles.coffeePropertyIntro}>
          <p className={styles.coffeeDetailEyebrow}>PROPERTY FIT</p>
          <h2 id="clubs-property-title">
            BUILDING CHARACTER SETS THE STAGE. THE COMPLETE PROPERTY SHAPES THE
            FIT.
          </h2>
          <p>
            Use 1,000 m² as your starting orientation, not as an approval rule.
            We review your Clubs fit against the intended Format, the complete
            property and the evidence available for your opportunity.
          </p>
        </div>
        <div className={styles.coffeePropertyList}>
          {clubsPropertyReview.map((item, index) => (
            <p key={item}>
              <span>0{index + 1}</span>
              {item}
            </p>
          ))}
          <p className={styles.coffeePropertyBoundary}>
            Area alone never determines Clubs fit. A property introduction
            records an opportunity for review; it does not approve a Format,
            Deal, lease, funding or opening.
          </p>
        </div>
      </section>

      <section className={styles.coffeeCandidate} aria-labelledby="clubs-candidate-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>YOUR OPERATING FIT</p>
          <h2 id="clubs-candidate-title">
            OPERATE THE WHOLE EXPERIENCE. PROTECT EVERY RHYTHM.
          </h2>
        </div>
        <p>
          CRAYS Clubs may fit you if you can lead people and service, coordinate
          the member and guest experience, manage the venue rhythm, build local
          relationships and evidence your property route and own-capital
          readiness. Your experience, training, staffing and qualification
          requirements depend on the released Clubs Format and Deal Package.
          Browsing or registration grants you no Franchise status, Deal access,
          funding, territory or opening.
        </p>
      </section>

      <section className={styles.coffeeOperating} aria-labelledby="clubs-operating-title">
        <header>
          <p className={styles.coffeeDetailEyebrow}>OPERATING CORE</p>
          <h2 id="clubs-operating-title">
            FIVE OPERATING FAMILIES. ONE CONNECTED HOSPITALITY CONTEXT.
          </h2>
        </header>
        <div>
          {clubsOperatingCore.map((field, index) => (
            <article key={field.name}>
              <span>0{index + 1}</span>
              <h3>{field.name}</h3>
              <p>{field.copy}</p>
            </article>
          ))}
        </div>
        <p className={styles.clubsCapabilityBoundary}>
          These five fields describe the Clubs/Hospitality operating context.
          They do not state that every capability is live, integrated, equally
          mature or available at every property.
        </p>
      </section>

      <section className={styles.coffeeCustomer} aria-labelledby="clubs-customer-title">
        <div className={styles.coffeeCustomerMedia}>
          <Image
            src="/assets/images/crays-franchise/concepts/crays-coffee-coworking.jpg"
            fill
            sizes="(max-width: 900px) 100vw, 42vw"
            style={{ objectPosition: "50% 50%" }}
            alt=""
          />
        </div>
        <div className={styles.coffeeCustomerCopy}>
          <p className={styles.coffeeDetailEyebrow}>CLUBS GUEST EXPERIENCE</p>
          <h2 id="clubs-customer-title">
            YOUR GUESTS AND MEMBERS CONTINUE WITH CRAYS CLUBS.
          </h2>
          <p>
            The Clubs guest and customer experience remains with CRAYS Clubs at
            www.craysclub.com. This CRAYS.pro page explains the Franchise
            opportunity and does not replace or redesign the Clubs customer
            frontend.
          </p>
          <a
            className={styles.coffeeSecondaryAction}
            href="https://www.craysclub.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit CRAYS Clubs guest and customer experience — opens in a new tab"
          >
            VISIT CRAYS CLUBS
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className={styles.coffeeFranchise} aria-labelledby="clubs-franchise-title">
        <div>
          <p className={styles.coffeeDetailEyebrow}>FRANCHISE &amp; PROPERTY</p>
          <h2 id="clubs-franchise-title">
            START WITH A PROPERTY — OR A RELEASED CRAYS OPPORTUNITY.
          </h2>
        </div>
        <div>
          <p>
            Introduce a property for multi-format review or explore only the
            Deals CRAYS has released publicly. Neither action confirms Clubs
            fit, Candidate qualification, funding, Franchise award or an
            opening.
          </p>
          <div className={styles.coffeeFranchiseActions}>
            <Link className={styles.coffeePrimaryAction} href="/real-estate#submit-property">
              INTRODUCE YOUR PROPERTY
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={styles.coffeeSecondaryAction} href="/deals">
              REVIEW RELEASED OPPORTUNITIES
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.coffeeAuthorityNote}>
            CRAYS Clubs remains the guest and customer experience for Clubs
            Membership, Booking, Rooms, Events and Hospitality at
            www.craysclub.com. Use CRAYS.pro for your Franchise acquisition,
            Shared Login, stakeholder Portal and released shared SaaS
            capabilities. CRM, ERP, project and Deal views remain limited to
            what is released for your approved relationship and role.
          </p>
        </div>
      </section>
    </div>
  );
}

function LoginPage() {
  const roles = [
    [Building2, "PROPERTY OWNER OR BROKER", "Introduce and follow properties", "/account/create/continue/real-estate"],
    [Users, "FRANCHISE CANDIDATE", "Discover and evaluate opportunities", "/account/create/continue/candidate"],
    [Landmark, "FUNDING PARTNER", "Review governed deal evidence", "/account/create/continue/funding-partner"],
    [Store, "INVESTOR OR VENDOR", "Begin the relevant CRAYS relationship", "/portal"],
  ] as const;
  return (
    <>
      <GenericHero copy={pageCopy.login} image="/assets/images/franchise-crays-owner-portrait.webp" />
      <section className={styles.loginGrid}>
        {roles.map(([Icon, name, detail, href]) => <Link href={href} key={name}><Icon /><div><h2>{name}</h2><p>{detail}</p></div><ArrowRight /></Link>)}
      </section>
      <section className={styles.existingLogin}><p>ALREADY HAVE A CRAYS ACCOUNT?</p><Action href="/portal">GO TO SECURE LOGIN</Action></section>
    </>
  );
}

function StandardPage({ page }: { page: string }) {
  const copy = pageCopy[page];
  const images: Record<string, string> = {
    concepts: "/assets/images/franchise-cycling-room.jpg",
    "property-owners": "/assets/images/real-estate-review-lifestyle.jpeg",
    "franchise-partners": "/assets/images/franchise-footer-gym-partner.webp",
    partners: "/assets/images/franchise-deal-room-first-call.jpg",
    "funding-partners": "/assets/images/bank-credit-team-lifestyle.jpeg",
    investors: "/assets/images/franchise-crays-owner-portrait.webp",
    suppliers: "/assets/images/deals-opening-construction-pexels-15794759.jpg",
    "how-it-works": "/assets/images/deals-opening-blueprints-pexels-29299826.jpg",
  };
  return (
    <>
      <GenericHero copy={copy} image={images[page] ?? "/assets/images/franchise-footer-venue.webp"} />
      {page === "concepts" ? <ConceptGrid /> : page === "how-it-works" ? (
        <>
          <section className={styles.processDetail}>{process.map(([n, title, text]) => <article key={n}><span>{n}</span><h2>{title}</h2><p>{text}</p></article>)}</section>
          <ContinuityDetail />
        </>
      ) : (
        <RoleBody page={page} />
      )}
    </>
  );
}

function RoleBody({ page }: { page: string }) {
  const content: Record<string, { label: string; items: string[]; cta: string; href: string }> = {
    "property-owners": { label: "SIX PROPERTY FIT DIMENSIONS", items: ["Usable layout", "Access & visibility", "Technical base", "Planning route", "Commercial fit", "Delivery readiness"], cta: "INTRODUCE A PROPERTY", href: `${root}/property-owners/submit` },
    "franchise-partners": { label: "A BETTER STARTING POINT", items: ["Released location", "Concept rationale", "Operating case", "Capital context", "Risk scenarios", "Delivery route"], cta: "EXPLORE DEALS", href: `${root}/deals` },
    partners: { label: "CONNECTED RELATIONSHIPS", items: ["Property owners", "Franchise partners", "Funding partners", "Investors", "Vendors", "CRAYS Team"], cta: "CHOOSE YOUR ACCESS", href: `${root}/login` },
    "funding-partners": { label: "SIX DOSSIER LAYERS", items: ["Borrower readiness", "Capital requirement", "Location & property", "Operating case", "Scenarios & risks", "Conditions & monitoring"], cta: "START YOUR FUNDING RELATIONSHIP", href: "/account/create/continue/funding-partner" },
    investors: { label: "THE DILIGENCE VIEW", items: ["Platform thesis", "Concept portfolio", "Expansion logic", "Operating system", "Governance", "Risk boundaries"], cta: "BEGIN INVESTOR ONBOARDING", href: "/account/create/continue/investor" },
    suppliers: { label: "CAPABILITY NETWORK", items: ["Design & planning", "Construction", "Equipment", "Technology", "Operations supply", "Specialist services"], cta: "INTRODUCE YOUR CAPABILITY", href: "/account/create/continue/delivery-partner" },
  };
  const c = content[page];
  if (page === "property-owners") return <PropertyOwnerBody content={c} />;
  if (page === "franchise-partners") return <CandidateBody content={c} />;
  if (page === "funding-partners") return <FundingBody content={c} />;
  if (page === "investors") return <InvestorBody content={c} />;
  if (page === "suppliers") return <VendorBody content={c} />;
  if (page === "partners") return <EcosystemBody content={c} />;
  return (
    <>
      <section className={styles.roleList}><p className={styles.eyebrow}>{c.label}</p>{c.items.map((x, i) => <div key={x}><span>0{i + 1}</span><h2>{x}</h2><ArrowRight /></div>)}</section>
      <section className={styles.nextConcept}><p>READY TO ENTER THE CONNECTED CRAYS PROCESS?</p><Action href={c.href}>{c.cta}</Action></section>
    </>
  );
}

type RoleContent = { label: string; items: string[]; cta: string; href: string };

function NumberedList({ content }: { content: RoleContent }) {
  return <section className={styles.roleList}><p className={styles.eyebrow}>{content.label}</p>{content.items.map((x, i) => <div key={x}><span>0{i + 1}</span><h2>{x}</h2><ArrowRight /></div>)}</section>;
}

function RoleClose({ content, line }: { content: RoleContent; line: string }) {
  return <section className={styles.nextConcept}><p>{line}</p><Action href={content.href}>{content.cta}</Action></section>;
}

function PropertyOwnerBody({ content }: { content: RoleContent }) {
  return <>
    <section className={styles.ownerPromise}><div><p className={styles.eyebrow}>INTRODUCE ONCE</p><h2>WE TEST YOUR PROPERTY ACROSS THE PORTFOLIO.</h2></div><p>You do not need to force your property into a predetermined Format. We first clarify its building and commercial context, then show you where a deeper review is justified.</p></section>
    <NumberedList content={content} />
    <section className={styles.ownerJourney}><p className={styles.eyebrow}>YOUR PROPERTY JOURNEY</p>{["Introduce", "Clarify", "Evaluate", "Resolve", "Decide"].map((x, i) => <article key={x}><span>0{i + 1}</span><h3>{x}</h3><p>{["Share your first property facts.", "Confirm your access, use and technical context.", "Review your fit across four CRAYS Formats.", "Address your open commercial and planning questions.", "Proceed, hold or close with a visible rationale."][i]}</p></article>)}</section>
    <RoleClose content={content} line="ONE PROPERTY INTRODUCTION. FOUR POSSIBLE DIRECTIONS." />
  </>;
}

function CandidateBody({ content }: { content: RoleContent }) {
  const systemModules = [
    ["CRM", "Keep candidates, customers, partners and follow-up in the right relationship context."],
    ["PROJECTS & PPM", "Move the property, opening plan, owners, dependencies and due dates together."],
    ["DRIVE & COLLABORATION", "Keep approved documents, discussions and handovers connected to the work."],
    ["ERP", "Connect purchasing, inventory, finance and Store consequences instead of re-entering them."],
    ["HR", "Coordinate people, roles and work without turning preferences into permissions."],
    ["OPERATIONS", "Guide opening, shift, service and closing work around the exact Store context."],
    ["INSIGHTS", "See released operating signals with their source, scope and limitations."],
    ["LENDING", "Prepare a consistent Funding Case while the selected lender decides independently."],
    ["SYNC", "Reconcile admitted changes across systems without creating a second authority plane."],
  ] as const;
  const guestJourneys = [
    ["COFFEE", "Taste, menu, allergen, configuration, pickup, subscription and service guidance."],
    ["RETAIL", "Discovery, fit, bundles, availability, pickup, returns and repair guidance."],
    ["GYM", "Safe onboarding, plans, daily adaptation, exercise, recovery, classes and referrals."],
    ["CLUBS", "Discovery, membership, arrival, itinerary, bookings, in-stay help and checkout."],
  ] as const;

  return <>
    <section className={styles.candidateSequence}><div><p className={styles.eyebrow}>FROM DISCOVERY TO DECISION</p><h2>YOU DON&apos;T START WITH A BLANK PAGE.</h2></div><div>{["Discover a released opportunity", "Compare the location and concept", "Request governed deal access", "Review the protected package", "Decide whether to proceed"].map((x, i) => <p key={x}><span>0{i + 1}</span>{x}</p>)}</div></section>
    <NumberedList content={content} />

    <section id="operating-system" className={styles.partnerOperatingSystem} aria-labelledby="partner-operating-system-title">
      <div className={styles.partnerStickyIntro}>
        <p>THE BUSINESS BEHIND THE BRAND</p>
        <h2 id="partner-operating-system-title">YOUR CRAYS OPERATING SYSTEM.</h2>
        <p>You are not handed a logo and a stack of disconnected subscriptions. CRAYS is designed to digitally support the route from opportunity and opening through customer relationships, team work and everyday Store operations.</p>
        <p>Each module follows the exact Franchise Operator, legal entity, Store, role and released relationship context. The original source and accountable decision stay visible.</p>
      </div>
      <div className={styles.partnerSystemModules}>
        {systemModules.map(([name, copy], index) => <article key={name}><span>{String(index + 1).padStart(2, "0")}</span><h3>{name}</h3><p>{copy}</p></article>)}
      </div>
    </section>

    <section id="marketing" className={styles.partnerMarketing} aria-labelledby="partner-marketing-title">
      <div className={styles.partnerMarketingMedia}>
        <Image src="/assets/images/crays-pro-portal-community-generated.png" fill sizes="(max-width: 900px) 100vw, 54vw" alt="A CRAYS environment ready for community and local demand generation" />
      </div>
      <div className={styles.partnerMarketingCopy}>
        <Megaphone aria-hidden="true" />
        <p>MARKETING WORKSPACE INCLUDED</p>
        <h2 id="partner-marketing-title">FROM BRAND-READY CONTENT TO THE NEXT CUSTOMER ACTION.</h2>
        <p>Plan campaigns around your Store, work from governed brand and product context, prepare content, route approvals, publish through admitted channels and connect landing journeys with attributable follow-up.</p>
        <ul>
          <li>Campaign pipeline, briefs and calendars</li>
          <li>Content studio, asset rights and approvals</li>
          <li>Channel accounts and controlled publishing</li>
          <li>Offers, landing journeys, attribution and follow-up</li>
        </ul>
        <small>Included for Franchise Partners. The complete Marketing product releases in governed phases; no channel, audience or result is guaranteed.</small>
      </div>
    </section>

    <section id="work-partner" className={styles.partnerWorkPartner} aria-labelledby="partner-work-partner-title">
      <div>
        <Bot aria-hidden="true" />
        <p>OPENCLAW-POWERED. CRAYS-GOVERNED.</p>
        <h2 id="partner-work-partner-title">A WORK PARTNER FOR THE DAY YOU ACTUALLY HAVE.</h2>
      </div>
      <div>
        <p>Your included CRAYS work partner is intended to prepare priorities, surface exceptions, guide repeatable work and help the right person reach the next safe action across the released Operating System context.</p>
        <p>It does not invent authority or make a silent business decision. CRAYS Core controls identity, role, Store scope, consent, commands, receipts and reconciliation; OpenClaw orchestrates only admitted capabilities.</p>
        <strong>INCLUDED AT NO ADDITIONAL FRANCHISE FEE.</strong>
        <small>Capabilities are authorized and released in phases. The wider OpenClaw programme is not represented as fully live or complete.</small>
      </div>
    </section>

    <section id="guest-life-partner" className={styles.guestLifePartner} aria-labelledby="guest-life-partner-title">
      <div className={styles.guestLifePartnerHeading}>
        <p>AN ADVANTAGE YOUR GUESTS CAN FEEL</p>
        <h2 id="guest-life-partner-title">ONE HELPFUL RELATIONSHIP. FOUR DISTINCT CUSTOMER JOURNEYS.</h2>
        <p>CRAYS is designing an authorized Life Partner for customers and guests across every Vertical. It keeps the experience specific to Coffee, Retail, Gym or Clubs while helping the customer continue from discovery to service and the next useful action.</p>
      </div>
      <div className={styles.guestLifePartnerGrid}>
        {guestJourneys.map(([name, copy], index) => <article key={name}><span>{String(index + 1).padStart(2, "0")}</span><h3>{name}</h3><p>{copy}</p></article>)}
      </div>
      <p className={styles.guestLifePartnerBoundary}>Each Vertical journey requires its own product, safety, consent, seller, Store and release gates. The description is the intended Partner advantage&mdash;not a claim of complete current availability.</p>
    </section>

    <section className={styles.boundarySection}><p>PUBLIC DISCOVERY IS OPEN.</p><h2>PRIVATE EVIDENCE UNLOCKS ONLY AFTER THE RIGHT RELATIONSHIP IS CONFIRMED.</h2><span>Registration records your interest. It does not grant a franchise, approve funding or create a transaction.</span></section>
    <RoleClose content={content} line="SEE WHAT HAS ACTUALLY BEEN RELEASED." />
  </>;
}

function FundingBody({ content }: { content: RoleContent }) {
  return <>
    <section className={styles.bankIntro}><Landmark /><div><p className={styles.eyebrow}>YOUR UNDERWRITING VIEW</p><h2>TRACE YOUR CASE, NOT A SALES DECK.</h2></div><p>Use each layer to distinguish available evidence, open conditions and the responsible reviewer. CRAYS never presents an automated public credit decision as your institution&apos;s decision.</p></section>
    <NumberedList content={content} />
    <section className={styles.reviewRail}>{["Case released", "Access confirmed", "Evidence reviewed", "Questions resolved", "Decision recorded"].map((x, i) => <div key={x}><span>0{i + 1}</span><p>{x}</p></div>)}</section>
    <RoleClose content={content} line="JOIN THE CRAYS FUNDING NETWORK." />
  </>;
}

function InvestorBody({ content }: { content: RoleContent }) {
  return <>
    <section className={styles.investorThesis}><div><p className={styles.eyebrow}>YOUR INVESTMENT VIEW</p><h2>PROPERTY SUPPLY → DEAL EVIDENCE → OPERATORS → OPEN LOCATIONS.</h2></div><p>Review the system behind repeatable expansion without treating it as a public promise of returns. You receive company, opportunity and transaction information only within your approved relationship and scope.</p></section>
    <NumberedList content={content} />
    <section className={styles.investorQuestions}><p className={styles.eyebrow}>QUESTIONS THE PLATFORM MUST ANSWER</p>{["What makes a location eligible?", "Who carries the opening?", "Which assumptions drive the case?", "What remains unresolved?", "How is performance governed?"].map((x) => <h3 key={x}>{x}<ArrowRight /></h3>)}</section>
    <RoleClose content={content} line="UNDERSTAND THE NETWORK BEFORE REQUESTING ACCESS." />
  </>;
}

function VendorBody({ content }: { content: RoleContent }) {
  return <>
    <section className={styles.vendorIntro}><div><p className={styles.eyebrow}>CAPABILITY BEFORE ASSIGNMENT</p><h2>YOUR CRAFT.<br />BUILT INTO A REPEATABLE OPENING.</h2></div><p>Tell CRAYS where you operate, what your team owns and how you prove quality. Joining the network does not create a tender or promise work.</p></section>
    <NumberedList content={content} />
    <section className={styles.vendorStages}>{["Introduce capability", "Qualify scope", "Match opportunity", "Deliver package", "Verify handover"].map((x, i) => <article key={x}><span>0{i + 1}</span><h3>{x}</h3></article>)}</section>
    <RoleClose content={content} line="BUILD WITH A CONNECTED CRAYS DELIVERY NETWORK." />
  </>;
}

function EcosystemBody({ content }: { content: RoleContent }) {
  void content;
  return <AssociationEcosystemDetail />;
}

export function FranchiseSite({ page }: { page: string }) {
  if (!page) {
    return (
      <FranchiseShell overlayHeader>
        <div className={`${styles.site} ${styles.approvedHome}`}>
          <Home />
        </div>
      </FranchiseShell>
    );
  }

  if (page === "concepts") {
    return (
      <FranchiseShell>
        <div className={`${styles.site} ${styles.conceptsOverviewSite}`}>
          <ConceptsOverview />
        </div>
      </FranchiseShell>
    );
  }

  if (page === "concepts/coffee") {
    return (
      <FranchiseShell>
        <div className={`${styles.site} ${styles.coffeeDetailSite}`}>
          <CoffeeConceptPage />
        </div>
      </FranchiseShell>
    );
  }

  if (page === "concepts/retail") {
    return (
      <FranchiseShell>
        <div className={`${styles.site} ${styles.coffeeDetailSite} ${styles.retailDetailSite}`}>
          <RetailConceptPage />
        </div>
      </FranchiseShell>
    );
  }

  if (page === "concepts/gym") {
    return (
      <FranchiseShell>
        <div className={`${styles.site} ${styles.coffeeDetailSite} ${styles.gymDetailSite}`}>
          <GymConceptPage />
        </div>
      </FranchiseShell>
    );
  }

  if (page === "concepts/clubs") {
    return (
      <FranchiseShell>
        <div className={`${styles.site} ${styles.coffeeDetailSite} ${styles.clubsDetailSite}`}>
          <ClubsConceptPage />
        </div>
      </FranchiseShell>
    );
  }

  let content: React.ReactNode;
  if (page === "property-owners/submit") content = <PropertyForm />;
  else if (page === "deals") content = <DealPage />;
  else if (page === "login") content = <LoginPage />;
  else if (page.startsWith("concepts/")) content = <ConceptPage keyName={page.split("/")[1]} />;
  else content = <StandardPage page={page} />;

  return (
    <FranchiseShell>
      <div className={styles.site}><main>{content}</main></div>
    </FranchiseShell>
  );
}
