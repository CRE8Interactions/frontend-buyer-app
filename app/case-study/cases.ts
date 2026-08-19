export type BeforeAfter = { before: { t: string; d: string }; after: { t: string; d: string } };
export type OutcomeItem = { icon: string; t: string; d: string };
export type Block = { eyebrow: string; title: string; sub: string; items: OutcomeItem[] };
export type WhyItem = { n: string; t: string; d: string; from: string; to: string };
export type RollItem = { when: string; t: string; d: string };
export type Quote = { q: string; name: string; role: string };

export type Study = {
  slug: string;
  team: string;
  eyebrow: string;
  title: string;
  sub: string;
  img: string;
  logo: string;
  meta: { k: string; v: string }[];
  metrics?: { val: string; label: string }[];
  challengeTitle: string;
  challengeIntro: string;
  beforeAfter: BeforeAfter[];
  outcome: Block;
  fans?: Block;
  why?: { title: string; intro: string; items: WhyItem[] };
  rollout?: { title: string; intro: string; items: RollItem[] };
  quotes: Quote[];
  cta: { eyebrow: string; title: string; sub: string; note?: string };
};

export const STUDIES: Study[] = [
  {
    slug: "niagara-icedogs",
    team: "Niagara IceDogs",
    eyebrow: "Case study — Niagara IceDogs",
    title: "Exchanges in seconds",
    sub: "How the Niagara IceDogs cut season-ticket exchange time by over 90% — from 10–15 minutes per request down to a few clicks.",
    img: "/cases/icedogs.jpg",
    logo: "/cases/logos/icedogs.svg",
    meta: [
      { k: "Partner", v: "Niagara IceDogs" },
      { k: "League", v: "OHL" },
      { k: "Focus", v: "Season-Ticket Exchanges" },
    ],
    metrics: [{ val: "90%", label: "Reduction in exchange processing time" }],
    challengeTitle: "From 15 minutes to seconds",
    challengeIntro:
      "Season-ticket exchanges were eating up staff time and pulling focus from sales, service, and game-day operations. Every single exchange was a multi-step manual process.",
    beforeAfter: [
      {
        before: { t: "10–15 minutes per exchange", d: "Each request required locating original tickets, adjusting inventory by hand, reissuing new tickets, sending confirmations, and documenting the change internally." },
        after: { t: "A few clicks, under a minute", d: "Admin selects the unused ticket, chooses the future game, and confirms — all within one platform. The entire exchange is done in seconds." },
      },
      {
        before: { t: "Multiple disconnected steps", d: "Staff had to work across several systems to locate tickets, adjust inventory, reissue, and confirm. Each step was a manual handoff prone to errors." },
        after: { t: "One unified workflow", d: "Everything happens inside Blocktickets — select, swap, confirm. No jumping between tools or manual inventory adjustments." },
      },
      {
        before: { t: "Staff pulled from higher-value work", d: "During busy home stands, the volume of exchange requests consumed hours of staff time that could've gone toward sales, outreach, and fan service." },
        after: { t: "Staff refocused on revenue & fans", d: "With exchanges taking seconds instead of minutes, staff now spend their time on community outreach, sales, and personalized fan engagement." },
      },
    ],
    outcome: {
      eyebrow: "The outcome",
      title: "Time saved, service elevated",
      sub: "One streamlined workflow created a ripple effect across the entire front office.",
      items: [
        { icon: "⚡", t: "90%+ time savings", d: "Exchange processing dropped from 10–15 minutes to under a minute per request — saving countless staff hours over the season." },
        { icon: "🎟️", t: "Better season-ticket experience", d: "Season-ticket holders get faster, smoother exchanges — reinforcing their value and improving retention." },
        { icon: "📈", t: "More time for revenue", d: "Staff time freed up from repetitive admin tasks is now redirected toward game-day execution, sales, and fan engagement." },
      ],
    },
    quotes: [
      { q: "The exchange feature has been a game-changer. What used to take us 10–15 minutes per request now takes seconds. It's saved our staff countless hours and made the process much smoother for our season ticket holders.", name: "Steven", role: "Business Development & Ticket Sales, Niagara IceDogs" },
    ],
    cta: {
      eyebrow: "Your turn",
      title: "Stop wasting time on exchanges",
      sub: "See how Blocktickets can streamline your season-ticket operations — just like we did for the IceDogs.",
    },
  },

  {
    slug: "des-moines-buccaneers",
    team: "Des Moines Buccaneers",
    eyebrow: "Case study — Des Moines Buccaneers",
    title: "Group sales, reinvented",
    sub: "How the Des Moines Buccaneers eliminated upfront group payments, removed third-party fees, and gave every fan the power to pick their own seat.",
    img: "/cases/buccaneers.jpg",
    logo: "/cases/logos/buccaneers.svg",
    meta: [
      { k: "Partner", v: "Des Moines Buccaneers" },
      { k: "League", v: "USHL" },
      { k: "Focus", v: "Group Ticketing" },
    ],
    challengeTitle: "Every friction point, removed",
    challengeIntro:
      "Group sales were one of the Buccaneers' biggest operational headaches. The old process created friction for fans, organizers, and staff at every step.",
    beforeAfter: [
      {
        before: { t: "Full upfront payment required", d: "One organizer had to collect money from every group member before purchasing. This created delays, awkward follow-ups, and often killed deals entirely." },
        after: { t: "Every member pays individually", d: "Each person in the group pays for their own ticket at their convenience. No more chasing payments or fronting the full cost." },
      },
      {
        before: { t: "No seat selection for groups", d: "Fans couldn't choose their own seats within the group. Staff had to manually handle seating requests and adjustments." },
        after: { t: "Self-serve seat selection", d: "Every group member picks their own seat directly within the group's reserved section. Zero staff intervention needed." },
      },
      {
        before: { t: "Third-party tool with extra fees", d: "The team relied on an outside group sales platform that added unnecessary costs and created a disconnected experience." },
        after: { t: "Built-in, no extra cost", d: "Group ticketing is native to Blocktickets — no bolt-on tools, no added fees, no fragmented experience." },
      },
      {
        before: { t: "Heavy staff involvement", d: "Staff spent significant time on manual coordination — processing payments, assigning seats, and handling group logistics." },
        after: { t: "Fully self-serve workflow", d: "The entire group purchase flow is handled by fans themselves. Staff time on group sales administration dropped dramatically." },
      },
    ],
    outcome: {
      eyebrow: "The outcome",
      title: "Better for everyone",
      sub: "A single workflow upgrade created measurable improvements across the entire organization.",
      items: [
        { icon: "🎟️", t: "Better fan experience", d: "Group buyers get a modern, intuitive process — pick your seat, pay on your own, done. No more awkward coordination." },
        { icon: "💰", t: "Eliminated extra fees", d: "Removing the third-party group sales tool cut unnecessary costs and kept the experience within one unified platform." },
        { icon: "⚡", t: "Freed up staff time", d: "With a fully self-serve workflow, staff spend far less time on group sales administration and can focus on higher-value work." },
      ],
    },
    quotes: [
      { q: "Blocktickets completely transformed how we handle group sales. The ability for each person to choose their own seat and pay individually has removed a major friction point for our fans and staff. We've improved the fan experience, simplified operations, and eliminated unnecessary third-party fees.", name: "Eric Grundfast", role: "President, Des Moines Buccaneers" },
    ],
    cta: {
      eyebrow: "Your turn",
      title: "Group sales shouldn't be this hard",
      sub: "See how Blocktickets can simplify group ticketing for your organization — just like we did for the Buccaneers.",
    },
  },

  {
    slug: "ogden-raptors",
    team: "Ogden Raptors",
    eyebrow: "Case study — Ogden Raptors",
    title: "New revenue, new data",
    sub: "How the Ogden Raptors generated over $75K in new revenue from online ticketing and doubled their sponsorship value using fan data collected through Blocktickets.",
    img: "/cases/raptors.jpg",
    logo: "/cases/logos/raptors.svg",
    meta: [
      { k: "Partner", v: "Ogden Raptors" },
      { k: "Location", v: "Ogden, UT" },
      { k: "Focus", v: "Revenue & Sponsorships" },
    ],
    metrics: [
      { val: "$75K+", label: "In new revenue from online ticket sales and advanced packages" },
      { val: "2×", label: "Increase in sponsor value by leveraging fan data" },
    ],
    challengeTitle: "From gate sales to a growth engine",
    challengeIntro:
      "The Raptors had strong gameday energy but lacked the digital infrastructure to drive advance sales, capture fan data, or demonstrate value to sponsors with hard numbers.",
    beforeAfter: [
      {
        before: { t: "Mostly walk-up, day-of sales", d: "Revenue was heavily dependent on fans showing up at the gate. There was no system to drive advance online sales or offer flexible ticket packages." },
        after: { t: "$75K+ in new online revenue", d: "With Blocktickets, the Raptors launched online sales with family packs, group offers, and business packages — opening entirely new revenue streams." },
      },
      {
        before: { t: "No fan data collection", d: "Walk-up sales meant the team had no idea who their fans were, how often they attended, or what they purchased. Sponsors had nothing concrete to evaluate." },
        after: { t: "Rich fan behavior data", d: "Every online transaction captures fan demographics, purchase behavior, and attendance patterns — giving the front office a complete picture of their audience." },
      },
      {
        before: { t: "Sponsorship deals based on guesswork", d: "Without data, sponsor conversations relied on estimated attendance and anecdotal fan profiles. Deals were smaller and harder to close." },
        after: { t: "2× increase in sponsor value", d: "Fan data from Blocktickets lets the Raptors show sponsors exactly who attends, how they buy, and what they engage with — closing bigger deals backed by real numbers." },
      },
    ],
    outcome: {
      eyebrow: "The outcome",
      title: "Revenue up, sponsors sold",
      sub: "Blocktickets didn't just sell more tickets — it transformed how the Raptors generate and prove value across their entire business.",
      items: [
        { icon: "💰", t: "$75K+ new revenue", d: "Online ticket sales, family plans, group packages, and business bundles opened revenue streams that didn't exist before." },
        { icon: "📊", t: "Data-driven sponsorships", d: "Fan behavior data gave the Raptors proof points to close bigger sponsorship deals with confidence — more than doubling their sponsor value." },
        { icon: "🎟️", t: "Flexible ticket types", d: "Family packs, group offers, and business packages gave fans more ways to buy — increasing both conversion and average order value." },
      ],
    },
    quotes: [
      { q: "Online ticketing and flexible ticket types like group offers and family plans helped us drive more sales. But what really stood out was the fan data we now have — it's been key to closing larger sponsorships.", name: "Trever Wilson", role: "General Manager, Ogden Raptors" },
    ],
    cta: {
      eyebrow: "Your turn",
      title: "Turn ticket sales into a growth engine",
      sub: "See how Blocktickets can unlock new revenue and sponsor value for your organization — just like we did for the Raptors.",
    },
  },

  {
    slug: "nm-state",
    team: "NM State Athletics",
    eyebrow: "Case study — February 2026",
    title: "From outdated to unstoppable",
    sub: "How New Mexico State University is replacing decades-old ticketing infrastructure with a fully digital platform — in the largest athletics sponsorship deal in program history.",
    img: "/cases/nmstate.jpg",
    logo: "/cases/logos/nmstate.png",
    meta: [
      { k: "Partner", v: "NM State Athletics" },
      { k: "Scope", v: "All Athletics & Events" },
      { k: "Conference", v: "Conference USA" },
    ],
    challengeTitle: "Every pain point, addressed",
    challengeIntro:
      "NM State's ticketing hadn't kept pace with its ambitions. Here's what they were dealing with — and exactly how it's being fixed.",
    beforeAfter: [
      {
        before: { t: "Paper tickets & will-call lines", d: "Fans waited in long will-call queues. Walk-up purchases required manual processing. Physical tickets meant higher costs, fraud risk, and zero real-time data." },
        after: { t: "100% digital entry", d: "Instant mobile delivery, QR scan-in at every gate, and real-time validation. No paper, no lines, no friction." },
      },
      {
        before: { t: "Fragmented online purchasing", d: "Multiple disjointed systems with limited mobile support. Many fans abandoned purchases before completing checkout." },
        after: { t: "Unified, mobile-first storefront", d: "One branded platform for every sport. Season passes, single games, group sales, and promo codes — purchase in under 60 seconds from any device." },
      },
      {
        before: { t: "Manual attendance & revenue tracking", d: "Clicker counts, hand tallies, and spreadsheets. Reports took days to compile and were often unreliable. No centralized view of finances." },
        after: { t: "Real-time dashboards & financial visibility", d: "Live attendance by section and gate. Automated invoicing, centralized AR, and exportable reports for compliance and sponsorship verification." },
      },
      {
        before: { t: "Slow, paper-heavy box office", d: "Game-day bottlenecks from manual workflows. Staff pulled away from higher-value work to process walk-up transactions by hand." },
        after: { t: "Streamlined digital-first operations", d: "Redesigned box office workflows with POS integration, digital-first processing, and dedicated on-site support during major events." },
      },
    ],
    fans: {
      eyebrow: "What changes for fans",
      title: "Game day, reimagined",
      sub: "Behind every operational upgrade is a better experience for the people who matter most.",
      items: [
        { icon: "📱", t: "Buy anywhere, instantly", d: "Tickets on your phone in seconds. No account creation hoops, no confusing redirects. One tap to purchase, one tap to enter." },
        { icon: "⚡", t: "Skip the line", d: "Digital scan-in means walking straight to your seat. No printing, no will-call window, no digging through email for a PDF." },
        { icon: "🎟️", t: "Transfer & share easily", d: "Send tickets to friends and family with a text. No more coordinating handoffs in the parking lot or reprinting at the box office." },
      ],
    },
    outcome: {
      eyebrow: "Why Blocktickets",
      title: "Not just a vendor — a partner",
      sub: "NM State didn't just switch software. They chose a fundamentally different model for how ticketing should work in collegiate athletics.",
      items: [],
    },
    why: {
      title: "Not just a vendor — a partner",
      intro: "NM State didn't just switch software. They chose a fundamentally different model for how ticketing should work in collegiate athletics.",
      items: [
        { n: "01", t: "True partnership, not a service contract", d: "Blocktickets invests directly in your program through sponsorship dollars and capital commitments — not just licensing fees. Your success is our success, with aligned incentives from day one.", from: "Vendor contract", to: "Revenue partnership" },
        { n: "02", t: "Modern tech, not legacy software", d: "Built from scratch with mobile-first architecture, real-time data, and an intuitive interface. No decades-old code, no clunky workarounds, no modules you'll never use.", from: "Legacy platform", to: "Purpose-built" },
        { n: "03", t: "Dedicated support, not a help desk", d: "A named account team that knows your program, on-site support for major events, and a direct line when you need it — not a ticket queue with a 48-hour SLA.", from: "Support tickets", to: "Dedicated team" },
      ],
    },
    rollout: {
      title: "Implementation roadmap",
      intro: "A phased rollout ensuring zero disruption to fans or operations.",
      items: [
        { when: "February 2026", t: "Partnership announced", d: "Official designation as NM State's Official Ticket Provider, including capital commitment and priority naming rights." },
        { when: "Spring 2026", t: "Seat maps & season ticket sales", d: "Custom seat maps built for every venue, system configured, and season ticket campaigns go live — fans' first experience with the new platform." },
        { when: "Summer 2026", t: "Integration & staff training", d: "Full staff onboarding, box office workflow redesign, scanning hardware setup, and end-to-end testing across all venues ahead of the fall season." },
        { when: "Fall 2026", t: "Full game-day operations", d: "First football season under Blocktickets. Digital scanning at every gate, live attendance dashboards, and the mobile experience fully operational." },
        { when: "2026 – 2036", t: "Ongoing optimization", d: "Continuous platform enhancements, data-driven revenue strategy, and expanded capabilities across all athletics and campus events." },
      ],
    },
    quotes: [
      { q: "This is a transformational partnership that will set our athletics department on an upward trajectory like never before. We're already making remarkable progress, and this is only the beginning.", name: "Joe Fields", role: "Director of Athletics, New Mexico State University" },
      { q: "This partnership is about more than ticketing — it's about making a long-term investment in Aggie Athletics, supporting student-athletes, and helping build something meaningful for the entire Las Cruces community.", name: "Harrison Cogan", role: "CEO & Co-Founder, Blocktickets" },
    ],
    cta: {
      eyebrow: "Let's talk",
      title: "See what this looks like for your program",
      sub: "Every athletics department has different needs. Let's walk through how a Blocktickets partnership would work for yours.",
      note: "Blocktickets partners with collegiate athletics programs of all sizes — FBS, FCS, or Division II. If your ticketing needs a reset, we'd love to talk.",
    },
  },
];

export const getStudy = (slug: string) => STUDIES.find((s) => s.slug === slug);
