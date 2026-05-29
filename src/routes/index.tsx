import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Image as ImageIcon, Sparkles, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-leaves.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Together+ — A sanctuary for two" },
      { name: "description", content: "Share memories, chat in real-time, and grow together. Together+ is a private space designed for couples." },
      { property: "og:title", content: "Together+ — A sanctuary for two" },
      { property: "og:description", content: "A private space for couples to share memories, chat, and grow together." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-[color:var(--color-sage)] flex items-center justify-center">
            <Heart className="size-4 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-serif text-xl font-semibold">Together+</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/login" search={{ mode: "signup" }}><Button>Get started</Button></Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-up space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
            <Sparkles className="size-3" /> A private space for two
          </div>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
            A sanctuary for <em className="text-[color:var(--color-clay)] not-italic">your love</em>.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            Share daily moments, save memories, plan dreams. Together+ is the quiet, beautiful corner of the internet just for the two of you.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/login" search={{ mode: "signup" }}>
              <Button size="lg" className="gap-2 h-12 px-6 shadow-[var(--shadow-soft)]">
                Begin your journey <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="h-12 px-6">I already have an account</Button>
            </Link>
          </div>
        </div>
        <div className="relative animate-fade-up [animation-delay:120ms]">
          <div className="absolute -inset-4 bg-[var(--gradient-hero)] rounded-[3rem] blur-2xl opacity-60" />
          <img
            src={heroImage}
            alt="Two leaves intertwined, symbolizing partnership"
            className="relative rounded-[2rem] shadow-[var(--shadow-soft)] w-full object-cover aspect-[4/3]"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: MessageCircle, title: "Real-time chat", body: "Messages sync instantly across your devices. Like whispering, only kinder." },
  { icon: ImageIcon, title: "Memory vault", body: "A timeline of your photos and captions. Find the moments that matter, always." },
  { icon: Heart, title: "Just you two", body: "Pair with a single invite code. No feeds, no ads, no one else." },
];

function Features() {
  return (
    <section className="border-t border-border/50 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="max-w-2xl mb-16">
          <h2 className="font-serif text-4xl md:text-5xl mb-4">Designed for two.</h2>
          <p className="text-muted-foreground text-lg">Every detail considered for the rhythm of a relationship.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={f.title} className="bg-card rounded-2xl p-8 border border-border/60 hover:shadow-[var(--shadow-soft)] transition-shadow animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="size-12 rounded-xl bg-[color:var(--color-sage)]/15 flex items-center justify-center mb-5">
                <f.icon className="size-5 text-[color:var(--color-sage-deep)]" />
              </div>
              <h3 className="font-serif text-2xl mb-2">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Heart className="size-3.5" fill="currentColor" />
          <span>Together+ · Made with care</span>
        </div>
        <div>© {new Date().getFullYear()} Together+</div>
      </div>
    </footer>
  );
}
