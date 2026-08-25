'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { 
  ArrowRight, ShieldCheck, PieChart, Sparkles, Receipt, Lock,
  Info, Check
} from 'lucide-react'

export default function MarketingHomePage() {
  const { isLoaded, isSignedIn } = useUser()
  const isAuthenticated = isSignedIn

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Schema.org Structured Data for Google crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Shoe Budgeting",
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "All",
            "description": "Shoe Budgeting is a personal finance and budgeting web application provided by Shoetinblanks LLC to help individuals track expenses, categorize income, parse check stubs, and plan their personal budget.",
            "creator": {
              "@type": "Organization",
              "name": "Shoetinblanks LLC",
              "url": "https://shoetinblanks.com"
            }
          })
        }}
      />

      {/* Background glow aesthetics */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-600/20 via-indigo-500/15 to-purple-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/2 -left-40 w-[600px] h-[400px] bg-blue-500/10 blur-[140px] rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-blue-400 mb-8 animate-in fade-in zoom-in duration-500">
          <Sparkles className="w-4 h-4" />
          <span>Official Platform of Shoe Budgeting</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
          Take control of your money with <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Shoe Budgeting
          </span>
        </h1>

        <p className="max-w-3xl mx-auto text-lg sm:text-xl text-zinc-300 leading-relaxed mb-8">
          Welcome to <strong className="text-white">Shoe Budgeting</strong>, the smart personal finance and budget management platform provided by <strong className="text-white">Shoetinblanks LLC</strong>.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto mb-12">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login?signup=true"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Log In</span>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Explicit Purpose of Application Section */}
      <section id="purpose" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-8 sm:p-12 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Application Purpose
              </h2>
              <p className="text-zinc-400 text-sm">Overview of Shoe Budgeting by Shoetinblanks LLC</p>
            </div>
          </div>

          <div className="space-y-4 text-zinc-300 leading-relaxed text-base">
            <p>
              The purpose of <strong className="text-white">Shoe Budgeting</strong> is to provide users with a secure, all-in-one financial dashboard to organize personal finances, monitor income streams, track daily expenses, and achieve long-term budgeting goals.
            </p>
            <p>
              Through Shoe Budgeting, users can:
            </p>
            <ul className="grid sm:grid-cols-2 gap-3 pt-2 text-sm">
              <li className="flex items-start gap-2 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Track expenses and visualize spending by category.</span>
              </li>
              <li className="flex items-start gap-2 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Sync bank accounts seamlessly through Plaid integration.</span>
              </li>
              <li className="flex items-start gap-2 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Scan and parse paycheck stubs using secure client-side OCR.</span>
              </li>
              <li className="flex items-start gap-2 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Set custom budget targets, savings goals, and round-up rules.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Key Feature Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Powerful Features for Modern Financial Clarity
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            Everything in Shoe Budgeting is built for privacy, automation, and speed.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 rounded-3xl p-8 backdrop-blur-sm transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6">
              <PieChart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Expense & Budget Analytics</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Visualize where every dollar goes. Group your transactions by custom categories, track recurring bills, and forecast upcoming pay cycles.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 rounded-3xl p-8 backdrop-blur-sm transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Paycheck & OCR Parsing</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Upload paycheck stubs for automated data entry. Optical Character Recognition runs securely on your client device without saving images to the cloud.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 rounded-3xl p-8 backdrop-blur-sm transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Bank-Grade Privacy & Security</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Protected with Row-Level Security (RLS) on PostgreSQL. Your personal financial records are fully encrypted and accessible only by you.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Legal Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-900/30 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-zinc-800 text-blue-400 mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Designed for Transparency and Trust
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-8 max-w-2xl mx-auto">
            Shoe Budgeting is crafted to help individuals and families stay on top of their budgets with zero clutter. 
            We never sell your personal data. Review our commitments in our legal policies below.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            <Link href="/privacy-policy" className="text-blue-400 hover:text-blue-300 underline underline-offset-4">
              View Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-blue-400 hover:text-blue-300 underline underline-offset-4">
              View Terms of Service
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
