"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { EASE, ANIM } from "@/lib/constants";
import { startDemo } from "@/lib/api";
import NavLinks from "@/components/NavLinks";

const AGENTS = [
  {
    name: "Conservative",
    color: "bg-teal-500",
    border: "border-teal-500/25",
    description:
      "Prioritizes low-risk, high-confidence savings. Focuses on contract renegotiation, duplicate vendor consolidation, and payment term optimization.",
    traits: ["Low risk", "High confidence", "Quick wins"],
  },
  {
    name: "Aggressive",
    color: "bg-orange-500",
    border: "border-orange-500/25",
    description:
      "Maximizes total savings potential. Recommends vendor switches, process overhauls, and strategic sourcing changes that yield the highest ROI.",
    traits: ["High savings", "Bold moves", "Strategic"],
  },
  {
    name: "Balanced",
    color: "bg-indigo-500",
    border: "border-indigo-500/25",
    description:
      "Blends caution with ambition. Weighs implementation effort against savings magnitude to find the optimal middle ground for your organization.",
    traits: ["Best of both", "Weighted scoring", "Practical"],
  },
];

const HERO_ORBS = [
  {
    color: "rgb(20 184 166 / 0.25)", // teal — upper-left region
    size: 350,
    x: [-350, -180, -400, -220, -350],
    y: [-120, -60, -150, -30, -120],
    duration: 8,
  },
  {
    color: "rgb(249 115 22 / 0.2)", // orange — upper-right region
    size: 320,
    x: [300, 180, 380, 250, 300],
    y: [-100, -30, -140, 20, -100],
    duration: 10,
  },
  {
    color: "rgb(99 102 241 / 0.22)", // indigo — bottom-center
    size: 400,
    x: [-40, 100, -80, 60, -40],
    y: [120, 60, 160, 80, 120],
    duration: 9,
  },
];

const STEPS = [
  {
    num: "01",
    title: "Upload",
    description:
      "Drop your CSV or XLSX procurement data. Columns: Date, Vendor, Category, Amount, Department.",
  },
  {
    num: "02",
    title: "Preview",
    description:
      "Review spend breakdowns, trends, and vendor analysis before committing to a full run.",
  },
  {
    num: "03",
    title: "Analyze",
    description:
      "Three AI agents compete in real-time, each applying a different cost-optimization strategy.",
  },
  {
    num: "04",
    title: "Vote",
    description:
      "Compare recommendations side-by-side and vote for the insights that matter most to you.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleTryDemo() {
    setDemoLoading(true);
    try {
      const { session_id } = await startDemo();
      router.push(`/arena?session=${session_id}`);
    } catch {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-grid">
      {/* ── Hero ── */}
      <section className="relative overflow-clip">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {HERO_ORBS.map((orb, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full blur-3xl"
              style={{
                width: orb.size,
                height: orb.size,
                backgroundColor: orb.color,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                x: orb.x,
                y: orb.y,
              }}
              transition={{
                scale: { duration: 1.2, ease: EASE },
                opacity: { duration: 1.2, ease: EASE },
                x: {
                  duration: orb.duration,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                  delay: i * 0.8,
                },
                y: {
                  duration: orb.duration,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                  delay: i * 0.8,
                },
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-28 text-center lg:pt-36 lg:pb-32">
          <motion.div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3.5 py-1 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Multi-Agent Analysis
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          >
            AI-Powered Procurement <span className="text-indigo-600">Intelligence</span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-500 text-balance sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: EASE }}
          >
            Three competing AI agents analyze your spend data with conservative, aggressive, and
            balanced strategies — then you pick the winner.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
          >
            <motion.div {...ANIM.buttonTap}>
              <Link
                href="/upload"
                className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25"
              >
                Get Started
              </Link>
            </motion.div>
            <motion.div {...ANIM.buttonTap}>
              <button
                onClick={handleTryDemo}
                disabled={demoLoading}
                className="inline-flex h-10 items-center rounded-lg border border-indigo-200 bg-indigo-50 px-6 text-sm font-medium text-indigo-600 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] transition-all hover:bg-indigo-100 hover:shadow-[0_2px_4px_0_rgb(0_0_0/0.06)] disabled:opacity-50"
              >
                {demoLoading ? "Loading..." : "Try Demo"}
              </button>
            </motion.div>
            <motion.div {...ANIM.buttonTap}>
              <a
                href="#features"
                className="inline-flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-600 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] transition-all hover:border-zinc-300 hover:text-zinc-900 hover:shadow-[0_2px_4px_0_rgb(0_0_0/0.06)]"
              >
                Learn More
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7, ease: EASE }}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-zinc-700">3</span> competing agents
            </div>
            <span className="hidden sm:block h-3 w-px bg-zinc-300" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-zinc-700">CSV</span> +{" "}
              <span className="font-mono text-zinc-700">XLSX</span> support
            </div>
            <span className="hidden sm:block h-3 w-px bg-zinc-300" />
            <div className="flex items-center gap-2">
              Real-time <span className="font-mono text-zinc-700">SSE</span> streaming
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <motion.section
        id="features"
        className="border-t border-zinc-100 bg-white py-24"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Three Agents. Three Strategies. One Winner.
            </h2>
            <p className="mt-3 text-base text-zinc-500 max-w-lg mx-auto text-balance">
              Each agent independently analyzes your procurement data and produces ranked,
              actionable recommendations — then you compare and vote.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {AGENTS.map((agent, i) => (
              <motion.div
                key={agent.name}
                className={`group relative rounded-xl border ${agent.border} bg-zinc-50/50 p-6 transition-all hover:border-zinc-300 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] hover:shadow-[0_4px_12px_-4px_rgb(0_0_0/0.1)]`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: EASE }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className={`absolute inset-x-6 top-0 h-px ${agent.color} opacity-40`} />

                <div className="flex items-center gap-2.5 mb-4">
                  <span className={`h-2.5 w-2.5 rounded-full ${agent.color}`} />
                  <h3 className="text-sm font-semibold text-zinc-900">{agent.name}</h3>
                </div>

                <p className="text-sm leading-relaxed text-zinc-500">{agent.description}</p>

                <div className="mt-5 flex flex-wrap gap-1.5">
                  {agent.traits.map((trait) => (
                    <span
                      key={trait}
                      className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── How It Works ── */}
      <motion.section
        id="about"
        className="border-t border-zinc-100 py-24"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              How It Works
            </h2>
            <p className="mt-3 text-sm text-zinc-500">
              From upload to actionable insights in four steps.
            </p>
          </div>

          <div className="grid gap-px rounded-xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                className="relative bg-white p-6 hover:bg-zinc-50/50 transition-colors"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1, ease: EASE }}
              >
                <span className="font-mono text-sm text-indigo-500 mb-3 block">{step.num}</span>
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <motion.section
        className="border-t border-zinc-100 bg-white py-24"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Ready to optimize your spend?
          </h2>
          <p className="mt-3 text-base text-zinc-500 max-w-md mx-auto text-balance">
            Upload your procurement data and let three AI agents compete to find you the best
            savings opportunities.
          </p>
          <motion.div className="mt-8" {...ANIM.buttonTap}>
            <Link
              href="/upload"
              className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Footer ── */}
      <footer id="contact" className="border-t border-zinc-100 bg-zinc-50 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-zinc-600">Agent Arena</span>
            <span className="text-sm text-zinc-400 ml-1">&copy; {new Date().getFullYear()}</span>
          </div>
          <NavLinks
            className="flex items-center gap-4"
            linkClassName="text-sm text-zinc-400 transition-colors hover:text-zinc-600"
          />
        </div>
      </footer>
    </div>
  );
}
