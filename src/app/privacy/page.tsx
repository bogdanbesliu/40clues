import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Cookie, Database, Activity, Mail } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — 40Clues",
  description: "Privacy Policy and data handling practices for 40clues.com",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-8 sm:py-12 font-sans selection:bg-amber-500/30">
      <div className="max-w-xl w-full flex flex-col gap-6 flex-1">
        {/* Back navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Game</span>
          </Link>
          <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
            40Clues
          </span>
        </div>

        {/* Title Card */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100">
                Privacy Policy
              </h1>
              <p className="text-xs text-slate-400">Last updated: October 2026</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            At <strong>40Clues</strong> (accessible from{" "}
            <span className="text-amber-400">https://40clues.com</span>), we value your privacy
            and keep our data collection to an absolute minimum. You can play our daily movie
            deduction game completely anonymously, or optionally sign in to track your career
            stats and join the leaderboards.
          </p>
        </section>

        {/* 1. Data We Collect */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Database className="w-4 h-4" aria-hidden="true" />
            <h2>1. Information We Collect</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            We <strong>do not</strong> collect or store any personal data unless you explicitly
            choose to sign in with Google.
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5">
            <li>
              <strong>Guest Players:</strong> Your daily game progress and win streak are saved
              locally on your own device using your browser&apos;s{" "}
              <code className="text-amber-300 bg-slate-950 px-1.5 py-0.5 rounded">
                localStorage
              </code>
              .
            </li>
            <li>
              <strong>Registered Players (Google Sign-In):</strong> When you sign in with Google,
              we only store your <strong>display name</strong>, <strong>email address</strong>,
              and <strong>profile avatar URL</strong> provided by Google OAuth solely to unlock
              the full game features (saving your career stats, achievements, streaks, and
              displaying your score on the Leaderboard).
            </li>
          </ul>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            We never sell, rent, or share your email address or personal data with third parties
            or advertisers.
          </p>
        </section>

        {/* 2. Cookies & Local Storage */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Cookie className="w-4 h-4" aria-hidden="true" />
            <h2>2. Cookies &amp; Local Storage</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            We <strong>do not use advertising or tracking cookies</strong>. We only use strictly
            necessary functional storage:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5">
            <li>
              <strong>Local Storage:</strong> Used to remember which clues you unlocked today and
              your current streak so you don&apos;t lose progress when refreshing the page.
            </li>
            <li>
              <strong>Authentication Cookies (Supabase):</strong> If you sign in with Google,
              strictly necessary session cookies are used to keep you logged in securely.
            </li>
          </ul>
        </section>

        {/* 3. Performance Monitoring & Analytics */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Activity className="w-4 h-4" aria-hidden="true" />
            <h2>3. Anonymous Performance Monitoring</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            We use privacy-friendly, cookieless monitoring via{" "}
            <strong>Vercel Analytics &amp; Speed Insights</strong> to understand general website
            traffic (such as total page views and page load performance) and ensure the game runs
            smoothly. This telemetry is aggregated and does not identify individual users or track
            you across other websites.
          </p>
        </section>

        {/* 4. Data Deletion & Contact */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Mail className="w-4 h-4" aria-hidden="true" />
            <h2>4. Data Deletion &amp; Contact</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            If you wish to delete your account, profile statistics, and all associated scores from
            our database, please contact us at{" "}
            <strong className="text-amber-400">contact [@] 40clues.com</strong> and we will
            permanently remove your data.
          </p>
        </section>
      </div>

      {/* Footer */}
      <footer className="max-w-xl w-full border-t border-slate-900/80 mt-12 pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div>© 40Clues 2026. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="hover:text-amber-400 transition-colors underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
          >
            Play 40Clues
          </Link>
        </div>
      </footer>
    </main>
  );
}