"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Globe,
  Target,
  Compass,
  Users,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Heart,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* ===== Top Navigation ===== */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              A
            </div>
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              AIESEC
            </span>
            <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400 ml-1">
              in DLSU-Manila
            </span>
          </div>

          {/* Login / Register in the upper corner */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6">
              <Globe className="w-3.5 h-3.5" />
              Global platform · Run by youth, for youth
            </span>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Develop the leader in you.
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl">
              The Performance Management System of AIESEC in DLSU-Manila — track
              goals, measure impact, and grow passionate, competent Filipino
              leaders from our corner of Taft Avenue.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-300 dark:border-gray-700 bg-transparent"
                >
                  Member Login
                </Button>
              </Link>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              AIESEC members only · @aiesec.ph email required
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-blue-600/10 rounded-[2rem] blur-2xl" />
            <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800">
              <Image
                src="/aiesec-hero.jpg"
                alt="AIESEC in DLSU-Manila members"
                width={1200}
                height={800}
                className="w-full h-[420px] object-cover"
                priority
              />
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
          {[
            { icon: Globe, label: "Countries & territories", value: "150+" },
            { icon: Users, label: "Active members worldwide", value: "30,000+" },
            { icon: TrendingUp, label: "Years of impact", value: "75+" },
            { icon: CheckCircle, label: "UN ECOSOC", value: "Consultative" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 text-center"
            >
              <s.icon className="w-5 h-5 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Who we are ===== */}
      <section className="bg-white dark:bg-gray-800/40 border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Who we are
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            AIESEC is a global platform, non-governmental and not-for-profit
            organization entirely run by youth for youth. It is in consultative
            status with the United Nations Economic and Social Council (ECOSOC),
            empowering young people to discover and develop their leadership
            potential.
          </p>
        </div>
      </section>

      {/* ===== Vision & Mission ===== */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-5">
              <Compass className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Our Vision</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              To achieve peace and fulfillment of humankind&apos;s potential.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-5">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Our Mission</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              To develop the leadership potential of young people through
              experiential learning, cross-cultural volunteer exchanges, and
              international internships.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Gallery ===== */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            One local committee, one family
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Moments from AIESEC in DLSU-Manila.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-2 lg:col-span-1 row-span-2 rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <Image
              src="/aiesec-night.jpg"
              alt="AIESEC members at night"
              width={600}
              height={800}
              className="w-full h-full object-cover min-h-[300px]"
            />
          </div>
          <div className="col-span-2 lg:col-span-2 rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <Image
              src="/aiesec-classroom.jpg"
              alt="AIESEC general assembly"
              width={1280}
              height={720}
              className="w-full h-full object-cover min-h-[180px]"
            />
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <Image
              src="/aiesec-wpose.jpg"
              alt="AIESEC team bonding"
              width={1280}
              height={720}
              className="w-full h-full object-cover min-h-[180px]"
            />
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <Image
              src="/aiesec-hero.jpg"
              alt="AIESEC delegates"
              width={1280}
              height={720}
              className="w-full h-full object-cover min-h-[180px]"
            />
          </div>
        </div>
      </section>

      {/* ===== History ===== */}
      <section className="bg-blue-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <Heart className="w-8 h-8 mx-auto mb-5 opacity-90" />
          <h2
            className="text-3xl sm:text-4xl font-bold mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Our History
          </h2>
          <p className="text-lg text-blue-50 leading-relaxed max-w-3xl mx-auto">
            AIESEC in DLSU-Manila was founded — developing passionate and
            competent Filipino leaders for future generations from our corner of
            Taft Avenue.
          </p>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2
          className="text-3xl sm:text-4xl font-bold mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Ready to track your impact?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Sign in to the Performance Management System or create your AIESEC
          account to get started.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              Create an account
            </Button>
          </Link>
          <Link href="/login">
            <Button
              size="lg"
              variant="outline"
              className="border-gray-300 dark:border-gray-700 bg-transparent"
            >
              Login
            </Button>
          </Link>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
            <span className="font-semibold">AIESEC in DLSU-Manila</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            AIESEC Management System · 2026 · @aiesec.ph members only
          </p>
        </div>
      </footer>
    </div>
  )
}
