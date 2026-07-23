import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthUser } from "@/lib/useAuthUser";

import LogoMark from "@/components/LogoMark";
import LiveCallMock from "@/components/LiveCallMock";
import productPreview from "@/assets/product-preview.jpg";

import {
  ArrowRight,
  Mic,
  Trophy,
  BookOpen,
  Users,
  Gauge,
  Wand2,
  CheckCircle2,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/design-system/mj-design-system-db98fa";

const features = [
  {
    icon: Mic,
    title: "Live AI buyers",
    body: "Reps dial into a voice call with a buyer persona that pushes back, stalls, and objects like the real thing.",
  },
  {
    icon: Gauge,
    title: "Scored every call",
    body: "Discovery, objection handling, next-step — every rehearsal returns a numeric scorecard and a coaching note.",
  },
  {
    icon: BookOpen,
    title: "Your playbook, built in",
    body: "Paste battlecards, pricing pages, and pitch docs once. The buyer knows your product as well as your team does.",
  },
  {
    icon: Trophy,
    title: "Leaderboards that sting",
    body: "Public scores per role-play. Reps practice on their own time because the board is always watching.",
  },
  {
    icon: Wand2,
    title: "Build scenarios in minutes",
    body: "Describe the buyer, the moment, the objection. The template spins up a role-play and shareable deep link.",
  },
  {
    icon: Users,
    title: "Multi-seat ready",
    body: "Invite the whole team. Admins get reporting; reps get a clean home with the next call to make.",
  },
];

const steps = [
  { n: "01", t: "Remix the template", b: "One click spins up your own copy with backend, auth, and database wired — no setup, no config files." },
  { n: "02", t: "Run the setup wizard", b: "Sign in as the first admin, name your company, upload your playbook and ICP notes, and optionally connect the ElevenLabs connector for lifelike voices." },
  { n: "03", t: "Invite your team", b: "Share the link. Reps sign in, pick a scenario, and the AI buyer starts talking — with admin reporting live from call one." },
];

const faqs = [
  {
    q: "How fast can a team be live?",
    a: "An afternoon. Remix, sign in, run the setup wizard, paste your knowledge, invite the team.",
  },
  {
    q: "Is this only for GTM?",
    a: "It works for any voice rehearsal — CS save calls, recruiter screens, support escalations. Build the persona, ship the scenario.",
  },
  {
    q: "Can I white-label it?",
    a: "Yes. You own the code after remix. Swap the name, the colors, the copy — it is your product.",
  },
  {
    q: "What does it cost to run?",
    a: "The AI buyer runs on the built-in Lovable AI Gateway — no keys to paste. Browser voice is free out of the box; lifelike voices use the ElevenLabs connector (paid Starter plan, ~$5/mo) which you connect from workspace Connectors — no key pasting.",
  },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const { user, loading: authLoading } = useAuthUser();


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header
        className={
          "fixed top-0 inset-x-0 z-40 transition-all duration-300 " +
          (scrolled
            ? "backdrop-blur-md bg-background/70 border-b border-border/50"
            : "bg-transparent border-b border-transparent")
        }
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="font-display text-xl">Rehearsal</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 min-h-10">
            {!authLoading && (user ? (
              <Link to="/practice">
                <Button className="rounded-lg">
                  Go to dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="rounded-lg">Sign in</Button>
                </Link>
                <a href="#how">
                  <Button className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground">
                    Remix template <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </a>
              </>
            ))}
          </div>

        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-aurora">
        <div className="max-w-4xl mx-auto px-6 pt-32 pb-12 text-center animate-fade-in-up">
          <h1 className="font-display text-5xl md:text-7xl leading-[1.05] tracking-tight text-foreground">
            The flight simulator for your GTM team.
          </h1>
          <p className="mt-8 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed text-balance">
            Reps practice live calls against an AI buyer, get scored, and climb the leaderboard.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            <a href="#how">
              <Button size="lg" className="rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground h-14 px-8 text-base shadow-glow">
                Remix this template <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 pb-20 relative">
          <LiveCallMock />
        </div>
      </section>

      {/* Proof — pull quote + animated ticker */}
      <section className="border-y border-border bg-secondary overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 py-14 text-center">
          <p className="font-display text-2xl md:text-3xl text-foreground leading-snug max-w-3xl mx-auto text-balance">
            "The teams who close are the teams who rehearse out loud. Rehearsal makes that the default."
          </p>
        </div>
        <div className="relative overflow-hidden py-6 border-t border-border/50">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-secondary to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-secondary to-transparent" />
          <div className="flex w-max animate-ticker">
            {Array.from({ length: 2 }).map((_, dupeIdx) => (
              <div key={dupeIdx} className="flex items-center shrink-0" aria-hidden={dupeIdx === 1}>
                {[
                  "Built for",
                  "SDR teams",
                  "AE enablement",
                  "CS save plays",
                  "Founder-led GTM",
                  "Recruiter screens",
                  "Partner enablement",
                  "Onboarding cohorts",
                ].map((label, i) => (
                  <span key={i} className="flex items-center">
                    <span className="px-10 text-xs uppercase tracking-[0.25em] text-secondary-foreground/70 whitespace-nowrap">
                      {label}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-secondary-foreground/25" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Features */}
      <section id="features" className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">What's in the box</div>
            <h2 className="font-display text-5xl md:text-6xl leading-tight text-foreground">
              Everything a GTM team needs to rehearse out loud.
            </h2>
          </div>
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="rounded-xl shadow-card hover:shadow-elevated transition-shadow border-0">
                <CardContent className="p-7 space-y-4">
                  <div className="h-11 w-11 rounded-2xl bg-brand-blue/15 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-brand-blue" />
                  </div>
                  <div className="font-display text-2xl text-card-foreground">{title}</div>
                  <p className="text-sm text-card-foreground/65 leading-relaxed">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="py-28 bg-aurora-soft border-y border-border/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">From remix to live in an afternoon</div>
            <h2 className="font-display text-5xl md:text-6xl leading-tight text-foreground">
              Three steps. No backend code.
            </h2>
          </div>
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <Card key={s.n} className="rounded-xl shadow-card border-0">
                <CardContent className="p-8 space-y-4">
                  <div className="font-display text-5xl text-brand-blue leading-none">{s.n}</div>
                  <div className="font-display text-2xl text-card-foreground">{s.t}</div>
                  <p className="text-sm text-card-foreground/65 leading-relaxed">{s.b}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What you get — product screenshot replaces the SQL code card */}
      <section className="py-28">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">You own the code</div>
            <h2 className="font-display text-5xl md:text-6xl leading-tight text-foreground">
              A finished product, not a boilerplate.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed text-balance">
              Auth, database, AI buyer logic, scoring engine, admin reporting, leaderboards, knowledge ingestion, voice pipeline — all wired and shipping. Open the editor, change a name, push live.
            </p>
            <div className="mt-8 space-y-3">
              {[
                "Full React + Vite codebase, yours to fork forever",
                "Managed database with row-level security baked in",
                "Browser voice free out of the box; ElevenLabs via one-click connector for lifelike voices",
                "Admin reporting, per-rep stats, leaderboards",
                "Deep links, knowledge base, multi-tenant ready",
              ].map((line) => (
                <div key={line} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand-blue shrink-0 mt-0.5" />
                  <span className="text-foreground">{line}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <Card className="relative rounded-xl shadow-elevated border-0 overflow-hidden">
              <CardContent className="p-0">
                <img
                  src={productPreview}
                  alt="Rehearsal product dashboard showing leaderboard and a discovery call scenario"
                  width={1280}
                  height={960}
                  loading="lazy"
                  className="block w-full h-auto"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-28 bg-aurora">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Questions</div>
          <h2 className="font-display text-5xl md:text-6xl leading-tight text-foreground mb-12">
            The honest answers.
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border/50">
                <AccordionTrigger className="text-left font-display text-xl hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28">
        <div className="max-w-5xl mx-auto px-6">
          <Card className="rounded-2xl overflow-hidden border-0 shadow-elevated bg-ink">
            <CardContent className="p-0">
              <div className="p-14 md:p-20 text-center relative">

                <div className="relative">
                  <h2 className="font-display text-5xl md:text-7xl leading-[0.95] text-white max-w-3xl mx-auto">
                    Make your team <span className="text-brand-blue">rehearse.</span>
                  </h2>
                  <p className="mt-6 text-lg text-white/70 max-w-xl mx-auto text-balance">
                    Remix the template. Be live with your first scenario before the day ends.
                  </p>

                  <div className="mt-10 flex items-center justify-center">
                    <a href="#how">
                      <Button size="lg" className="rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground h-14 px-8 text-base shadow-glow">
                        Remix template <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <LogoMark className="h-6 w-6" />
            <span className="font-display text-lg text-foreground">Rehearsal</span>
          </div>
          <div>An open template. Remix, white-label, ship.</div>
        </div>
      </footer>
    </div>
  );
}
