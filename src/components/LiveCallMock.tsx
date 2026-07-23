import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Card, CardContent, Badge, Button } from "@/design-system/mj-design-system-db98fa";

type Msg = {
  who: "buyer" | "rep";
  text: string;
  typingMs: number;
  holdMs: number;
};

const SCRIPT: Msg[] = [
  {
    who: "buyer",
    text: "\"Look, we already tried something like this last quarter. Why would this time be different?\"",
    typingMs: 1400,
    holdMs: 2600,
  },
  {
    who: "rep",
    text: "\"Totally fair. Can I ask what specifically didn't land — was it the rollout, the adoption, or the ROI?\"",
    typingMs: 1600,
    holdMs: 3000,
  },
];

const TARGET_SCORES = { total: 87, discovery: 92, objection: 84, next: 85 };

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-card-foreground/60 animate-[pulse_1s_ease-in-out_infinite]" />
      <span className="h-1.5 w-1.5 rounded-full bg-card-foreground/60 animate-[pulse_1s_ease-in-out_0.15s_infinite]" />
      <span className="h-1.5 w-1.5 rounded-full bg-card-foreground/60 animate-[pulse_1s_ease-in-out_0.3s_infinite]" />
    </span>
  );
}

export default function LiveCallMock() {
  // step: 0=buyer typing, 1=buyer shown, 2=rep typing, 3=rep shown, then loop reset
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [scores, setScores] = useState({ total: 0, discovery: 0, objection: 0, next: 0 });

  // sequence loop
  useEffect(() => {
    const timeouts: number[] = [];
    const run = (s: number) => {
      const msg = SCRIPT[Math.floor(s / 2)];
      const isTyping = s % 2 === 0;
      const delay = isTyping ? msg.typingMs : msg.holdMs;
      timeouts.push(
        window.setTimeout(() => {
          const next = s + 1;
          if (next >= SCRIPT.length * 2) {
            // brief pause then reset
            timeouts.push(
              window.setTimeout(() => {
                setStep(0);
                run(0);
              }, 1800)
            );
            setStep(next);
          } else {
            setStep(next);
            run(next);
          }
        }, delay)
      );
    };
    run(0);
    return () => timeouts.forEach(clearTimeout);
  }, []);

  // call timer
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // score ramps up as conversation progresses
  useEffect(() => {
    const progress = Math.min(step / (SCRIPT.length * 2), 1);
    const ease = progress * progress * (3 - 2 * progress);
    setScores({
      total: Math.round(TARGET_SCORES.total * ease),
      discovery: Math.round(TARGET_SCORES.discovery * ease),
      objection: Math.round(TARGET_SCORES.objection * ease),
      next: Math.round(TARGET_SCORES.next * ease),
    });
  }, [step]);

  const buyerVisible = step >= 1;
  const buyerTyping = step === 0;
  const repVisible = step >= 3;
  const repTyping = step === 2;

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <Card className="rounded-xl shadow-elevated overflow-hidden border-2 border-ink/80 backdrop-blur bg-card/90">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-[1fr_280px]">
          <div className="p-8 md:p-10 space-y-6 text-card-foreground">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-lg bg-brand-pink opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-pink" />
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-card-foreground/60">Live rehearsal</span>
              <Badge className="rounded-lg bg-brand-blue/20 text-brand-blue border-0 ml-auto">Discovery</Badge>
            </div>
            <div className="space-y-4 min-h-[180px]">
              {/* Buyer */}
              <div className="flex gap-3 transition-all duration-500 ease-out" style={{ opacity: buyerTyping || buyerVisible ? 1 : 0, transform: (buyerTyping || buyerVisible) ? "translateY(0)" : "translateY(8px)" }}>
                <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-brand" />
                <div className="rounded-2xl rounded-tl-sm bg-card-foreground/10 text-card-foreground px-4 py-3 text-sm">
                  {buyerTyping ? <TypingDots /> : SCRIPT[0].text}
                </div>
              </div>
              {/* Rep */}
              <div className="flex gap-3 flex-row-reverse transition-all duration-500 ease-out" style={{ opacity: repTyping || repVisible ? 1 : 0, transform: (repTyping || repVisible) ? "translateY(0)" : "translateY(8px)" }}>
                <div className="h-9 w-9 shrink-0 rounded-lg bg-brand-blue" />
                <div className="rounded-2xl rounded-tr-sm bg-brand-blue/20 text-card-foreground px-4 py-3 text-sm">
                  {repTyping ? <TypingDots /> : SCRIPT[1].text}
                </div>
              </div>
            </div>
            <div className="pt-4 flex items-center gap-3">
              <Button className="rounded-lg bg-card-foreground text-card hover:bg-card-foreground/90 font-mono tabular-nums">
                <Phone className="h-4 w-4 mr-2" /> {mm}:{ss}
              </Button>
              <span className="text-xs text-card-foreground/60">AI buyer · Mid-market CFO</span>
            </div>
          </div>
          <div className="bg-gradient-soft p-8 md:p-10 border-l border-border/50 flex flex-col justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Live score</div>
              <div className="font-display text-7xl text-foreground leading-none tabular-nums">{scores.total}</div>
              <div className="text-sm text-muted-foreground mt-1">/ 100</div>
            </div>
            <div className="space-y-2 mt-6">
              {([["Discovery", scores.discovery], ["Objection", scores.objection], ["Next step", scores.next]] as const).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-foreground tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
