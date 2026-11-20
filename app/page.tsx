import Link from "next/link";
import { Fragment } from "react";
import Breakable from "@/app/components/Breakable";

const HEADLINE = "Interfaces built to hold together under pressure.";
const SUB_HEADER =
    "We design and engineer resilient web applications with clean architecture, predictable state, and thoughtful motion.";

const NAV = [
    { label: "Work", href: "/work" },
    { label: "Services", href: "/services" },
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
];

const CLIENTS = ["Brittle Bank", "Shaky Ventures", "Tilt.io", "Leanto Logistics", "Wobblr", "Crumble & Co"];

const STATS = [
    { value: "99.99%", label: "Uptime", note: "*measured only during maintenance windows" },
    { value: "0", label: "Known bugs", note: "*we stopped looking" },
    { value: "100%", label: "Test coverage", note: "*of the tests we wrote" },
    { value: "24/7", label: "Support", note: "*leave a message after the crash" },
];

const SERVICES = [
    {
        icon: "🏗️",
        title: "Load-Bearing Architecture",
        text: "Every component is stress-tested before launch by pressing it firmly with one finger.",
    },
    {
        icon: "🔩",
        title: "Fault-Tolerant Systems",
        text: "Our systems tolerate faults. Mostly yours.",
    },
    {
        icon: "🧱",
        title: "Structural Integrity Audits",
        text: "We inspect your codebase for cracks, then lean on it gently to see what happens.",
    },
    {
        icon: "🛡️",
        title: "Enterprise-Grade Stability",
        text: "Independently certified by a certificate we generated ourselves.",
    },
    {
        icon: "🚀",
        title: "Zero-Downtime Deployments",
        text: "We never go down. We simply lie down, briefly, at a time that suits you.",
    },
    {
        icon: "📐",
        title: "Pixel-Perfect Delivery",
        text: "Every pixel is carefully placed and firmly attached. Terms and conditions apply.",
    },
];

const STEPS = [
    { title: "Discovery", text: "We listen carefully to your needs, then nod thoughtfully." },
    { title: "Architecture", text: "We draw boxes and arrows. The arrows are structural." },
    { title: "Build", text: "Constructed under a strict no-tape policy (currently under review)." },
    { title: "Launch", text: "We press the big button. Then we press it again, just to be sure." },
];

const TESTIMONIALS = [
    {
        quote: "Since hiring Tilt, our site has never gone down. Admittedly we have not managed to open it, but still.",
        name: "Marta V.",
        role: "CTO, Brittle Bank",
    },
    {
        quote: "They delivered exactly on time. The time was never specified, but it was exact.",
        name: "Jonas P.",
        role: "Founder, Tilt.io",
    },
    {
        quote: "10/10 would trust with load-bearing JavaScript.",
        name: "Dave",
        role: "Accounting, Leanto Logistics",
    },
];

const TIERS = [
    {
        name: "Sturdy",
        price: "€4,999",
        tagline: "For sites that mostly stay put.",
        features: ["One (1) screw per page", "Glue (non-toxic)", "Email support, eventually"],
        highlight: false,
    },
    {
        name: "Fortified",
        price: "€9,999",
        tagline: "For sites with ambitions.",
        features: ["Two (2) screws per page", "Premium duct tape", "Phone support, if it rings"],
        highlight: true,
    },
    {
        name: "Bunker",
        price: "€19,999",
        tagline: "For sites that simply cannot fall.",
        features: [
            "Unlimited screws",
            "Industrial-grade prayer",
            "A dedicated person who looks worried on your behalf",
        ],
        highlight: false,
    },
];

const TEAM = [
    { initial: "G", name: "Gerda", role: "Head of Structural Integrity", bio: "On leave, since the incident." },
    { initial: "T", name: "Tom", role: "Principal Duct Tape Engineer", bio: "Has a roll for every occasion." },
    { initial: "L", name: "Lucia", role: "Chief Stability Officer", bio: "Will be right back. Please hold the wall." },
];

const FAQ = [
    {
        q: "Is this website supposed to be falling apart?",
        a: "No. It is perfectly stable. Please stop clicking things.",
    },
    {
        q: "Do you offer refunds?",
        a: "We offer thoughts and prayers, both fully refundable.",
    },
    {
        q: "What does your warranty cover?",
        a: "Everything that has not yet fallen off. Fallen items are covered by our separate Fallen Items Policy, which has also fallen off.",
    },
    {
        q: "How long will my site last?",
        a: "Longer than the last one. Possibly.",
    },
];

function BreakableText({ text, mode = "words" }: { text: string; mode?: "words" | "chars" }) {
    const words = text.split(" ");
    return (
        <>
            {words.map((word, i) => (
                <Fragment key={`${word}-${i}`}>
                    {mode === "words" ? (
                        <Breakable>
                            <span>{word}</span>
                        </Breakable>
                    ) : (
                        <span className="inline-block whitespace-nowrap">
                            {Array.from(word).map((char, j) => (
                                <Breakable key={`${char}-${j}`}>
                                    <span>{char}</span>
                                </Breakable>
                            ))}
                        </span>
                    )}
                    {i < words.length - 1 ? " " : null}
                </Fragment>
            ))}
        </>
    );
}

function SectionHeading({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
    return (
        <div className="mb-10 max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                <BreakableText text={eyebrow} />
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                <BreakableText text={title} />
            </h2>
            {intro ? (
                <p className="text-slate-600">
                    <BreakableText text={intro} />
                </p>
            ) : null}
        </div>
    );
}

export default function HomePage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Notice banner */}
                <div className="bg-emerald-600 px-6 py-2 text-center text-sm font-medium text-white">
                    <BreakableText text="Notice: this website is completely stable. Any rumours to the contrary are false." />
                </div>
         

            {/* Header */}
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
                    <Link href="/" className="text-lg font-bold tracking-tight">
                        <BreakableText text="Tilt Studio" mode="chars" />
                    </Link>
                    <nav className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-medium text-slate-600">
                        {NAV.map((item) => (
                            <Breakable key={item.href}>
                                <Link href={item.href} className="hover:text-slate-900">
                                    {item.label}
                                </Link>
                            </Breakable>
                        ))}
                        <Breakable>
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                All systems operational
                            </span>
                        </Breakable>
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-6">
                {/* Hero */}
                <section className="max-w-2xl space-y-6 py-20">
                    <h1 className="text-5xl font-extrabold tracking-tight text-slate-950">
                        <BreakableText text={HEADLINE} mode="chars" />
                    </h1>
                    <div className="text-lg leading-relaxed text-slate-600">
                        <BreakableText text={SUB_HEADER} mode="chars" />
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2">
                        <Breakable>
                            <Link
                                href="/work"
                                className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                                Explore Our Work
                            </Link>
                        </Breakable>
                        <Breakable>
                            <Link
                                href="/contact"
                                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                            >
                                Start a Project
                            </Link>
                        </Breakable>
                    </div>
                </section>

                {/* Trusted by */}
                <section className="border-t border-slate-200 py-10">
                    <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
                        <BreakableText text="Trusted by teams at" />
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                        {CLIENTS.map((client) => (
                            <Breakable key={client}>
                                <span className="text-lg font-bold tracking-tight text-slate-400">{client}</span>
                            </Breakable>
                        ))}
                    </div>
                </section>

                {/* Stats */}
                <section className="border-t border-slate-200 py-16">
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {STATS.map((stat) => (
                            <Breakable key={stat.label}>
                                <div className="h-full rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                                    <div className="text-4xl font-extrabold tracking-tight text-slate-950">{stat.value}</div>
                                    <div className="mt-1 text-sm font-semibold text-slate-700">{stat.label}</div>
                                    <div className="mt-2 text-xs text-slate-400">{stat.note}</div>
                                </div>
                            </Breakable>
                        ))}
                    </div>
                </section>

                {/* Services */}
                <section className="border-t border-slate-200 py-16">
                    <SectionHeading
                        eyebrow="What we do"
                        title="Engineering you can lean on"
                        intro="Our services are built on solid foundations. We have been told this is not how foundations work."
                    />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {SERVICES.map((s) => (
                            <Breakable key={s.title}>
                                <div className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="text-3xl">{s.icon}</div>
                                    <h3 className="mt-4 text-lg font-semibold text-slate-950">{s.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
                                </div>
                            </Breakable>
                        ))}
                    </div>
                </section>

                {/* Process */}
                <section className="border-t border-slate-200 py-16">
                    <SectionHeading
                        eyebrow="How we work"
                        title="A rigorous four-step process"
                        intro="Refined over many projects, several of which are still standing."
                    />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {STEPS.map((step, i) => (
                            <Breakable key={step.title}>
                                <div className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                                        {i + 1}
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold text-slate-950">{step.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
                                </div>
                            </Breakable>
                        ))}
                    </div>
                </section>

                {/* Testimonials */}
                <section className="border-t border-slate-200 py-16">
                    <SectionHeading eyebrow="Kind words" title="Our clients speak for themselves" />
                    <div className="grid gap-6 lg:grid-cols-3">
                        {TESTIMONIALS.map((t) => (
                            <Breakable key={t.name}>
                                <figure className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <blockquote className="text-sm leading-relaxed text-slate-700">“{t.quote}”</blockquote>
                                    <figcaption className="mt-4 text-sm">
                                        <span className="font-semibold text-slate-950">{t.name}</span>
                                        <span className="text-slate-500">, {t.role}</span>
                                    </figcaption>
                                </figure>
                            </Breakable>
                        ))}
                    </div>
                </section>

                {/* Pricing */}
                <section className="border-t border-slate-200 py-16">
                    <SectionHeading
                        eyebrow="Pricing"
                        title="Transparent pricing, firmly attached"
                        intro="All packages include our Stability Promise. Please do not ask to see it."
                    />
                    <div className="grid gap-6 lg:grid-cols-3">
                        {TIERS.map((tier) => (
                            <Breakable key={tier.name}>
                                <div
                                    className={`h-full rounded-xl border p-6 shadow-sm ${
                                        tier.highlight
                                            ? "border-slate-900 bg-slate-900 text-white"
                                            : "border-slate-200 bg-white text-slate-900"
                                    }`}
                                >
                                    {tier.highlight ? (
                                        <div className="mb-3 inline-block rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                                            Most popular (with us)
                                        </div>
                                    ) : null}
                                    <h3 className="text-xl font-bold">{tier.name}</h3>
                                    <p className={`mt-1 text-sm ${tier.highlight ? "text-slate-300" : "text-slate-500"}`}>
                                        {tier.tagline}
                                    </p>
                                    <div className="mt-4 text-4xl font-extrabold tracking-tight">{tier.price}</div>
                                    <ul className="mt-6 space-y-2 text-sm">
                                        {tier.features.map((f) => (
                                            <li key={f}>✓ {f}</li>
                                        ))}
                                    </ul>
                                    <div
                                        className={`mt-6 rounded-lg px-4 py-2 text-center text-sm font-semibold ${
                                            tier.highlight ? "bg-white text-slate-900" : "bg-slate-900 text-white"
                                        }`}
                                    >
                                        Choose {tier.name}
                                    </div>
                                </div>
                            </Breakable>
                        ))}
                    </div>
                </section>

                {/* Team */}
                <section className="border-t border-slate-200 py-16">
                    <SectionHeading
                        eyebrow="The team"
                        title="Meet the people holding it together"
                        intro="Passionate professionals with a combined total of several years of experience."
                    />
                    <div className="grid gap-6 sm:grid-cols-3">
                        {TEAM.map((m) => (
                            <Breakable key={m.name}>
                                <div className="h-full rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-2xl font-bold text-slate-600">
                                        {m.initial}
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold text-slate-950">{m.name}</h3>
                                    <p className="text-sm font-medium text-emerald-700">{m.role}</p>
                                    <p className="mt-2 text-sm text-slate-600">{m.bio}</p>
                                </div>
                            </Breakable>
                        ))}
                    </div>
                </section>

                {/* FAQ */}
                <section className="border-t border-slate-200 py-16">
                    <SectionHeading eyebrow="FAQ" title="Questions we are comfortable answering" />
                    <div className="grid gap-6 md:grid-cols-2">
                        {FAQ.map((item) => (
                            <Breakable key={item.q}>
                                <div className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <h3 className="font-semibold text-slate-950">{item.q}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
                                </div>
                            </Breakable>
                        ))}
                    </div>
                </section>

                {/* Final CTA */}
                <section className="border-t border-slate-200 py-16">
                    <div className="rounded-2xl bg-slate-900 px-8 py-14 text-center text-white">
                        <h2 className="text-3xl font-bold tracking-tight">
                            <BreakableText text="Ready to build something that lasts?" />
                        </h2>
                        <p className="mx-auto mt-3 max-w-xl text-slate-300">
                            <BreakableText text="Terms and conditions apply to the word “lasts”." />
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-4">
                            <Breakable>
                                <Link
                                    href="/contact"
                                    className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                                >
                                    Book a Free Consultation
                                </Link>
                            </Breakable>
                            <Breakable>
                                <Link
                                    href="/work"
                                    className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                                >
                                    Please Do Not Click This
                                </Link>
                            </Breakable>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto max-w-5xl px-6 py-10">
                    <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
                        <p>
                            <BreakableText text="© 2026 Tilt Studio. All rights reserved. Some rights may have fallen off." />
                        </p>
                        <div className="flex gap-5">
                            {["Privacy", "Terms", "Warranty (void)"].map((label) => (
                                <Breakable key={label}>
                                    <Link href="/" className="hover:text-slate-900">
                                        {label}
                                    </Link>
                                </Breakable>
                            ))}
                        </div>
                    </div>
                    <p className="mt-6 text-xs text-slate-400">
                        <BreakableText text="Structural integrity: 100%. *As of the last time anybody checked, which was before launch." />
                    </p>
                </div>
            </footer>
        </div>
    );
}