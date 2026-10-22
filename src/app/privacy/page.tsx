import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Cookie, Activity, Lock, Database } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — 40clues.com",
  description: "Privacy policy and transparency details for 40clues.com.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-10 font-sans selection:bg-amber-500/30">
      <div className="max-w-2xl w-full flex flex-col gap-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Game</span>
        </Link>

        {/* Header */}
        <header className="border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-100">
              Privacy Policy
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Last updated: October 2026 • 40clues.com
          </p>
        </header>

        {/* Content Sections */}
        <div className="flex flex-col gap-6 text-sm text-slate-300 leading-relaxed">
          {/* Section 1: Overview */}
          <section className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
              <Lock className="w-4 h-4 text-emerald-400" />
              <h2>Minimal Data Collection</h2>
            </div>
            <p>
              At <strong>40clues.com</strong>, we believe in privacy by design. You can play the daily game completely anonymously as a guest without signing up.
            </p>
            <p>
              If you choose to authenticate via Google OAuth to unlock full game features (such as multi-device streak syncing and global leaderboards), we strictly collect and store <strong>only your name and email address</strong> (along with your public Google profile picture if provided). We do <strong>not</strong> request, access, or store any other personal data, contacts, or private account information.
            </p>
          </section>

          {/* Section 2: Cookies */}
          <section className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
              <Cookie className="w-4 h-4 text-amber-400" />
              <h2>Do We Use Cookies?</h2>
            </div>
            <p>
              <strong>Yes, but strictly functional cookies and local storage:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-1">
              <li>
                <strong>Authentication & Session Cookies:</strong> Managed securely via Supabase Auth to keep you securely signed in.
              </li>
              <li>
                <strong>Browser LocalStorage:</strong> Used to temporarily persist your daily clue progress, incorrect attempts, and current streak locally so you don't lose your game if you refresh the browser.
              </li>
              <li>
                We do <strong>not</strong> use third-party marketing, cross-site tracking, or advertising cookies.
              </li>
            </ul>
          </section>

          {/* Section 3: Monitoring & Performance Analytics */}
          <section className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2>Application Monitoring & Diagnostics</h2>
            </div>
            <p>
              To guarantee uptime, fast loading times, and instant clue delivery, our infrastructure includes technical monitoring (such as Vercel Speed Insights, Web Vitals, and server error diagnostics).
            </p>
            <p>
              This data is aggregated and anonymized. It helps us detect API latency with TMDB, track client-side rendering bottlenecks, and resolve exceptions without profiling individual users.
            </p>
          </section>

          {/* Section 4: Data Retention */}
          <section className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
              <Database className="w-4 h-4 text-rose-400" />
              <h2>Data Retention & Deletion</h2>
            </div>
            <p>
              Your scores and streak information are saved exclusively to display your ranking on the daily leaderboard. If you ever want your account and scores completely deleted, contact us and your records will be expunged immediately.
            </p>
          </section>
        </div>

        {/* Footer info inside Privacy */}
        <footer className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          <p>© Bogdan Besliu 2026. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}