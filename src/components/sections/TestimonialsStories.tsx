"use client";

import React from "react";
import { Building2, Repeat2, Users, Briefcase, Quote, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../ui/LanguageContext";

export const TestimonialsStories: React.FC = () => {
  const { t } = useLanguage();
  const stories = [
    {
      name: t("public.home.stories.s1name"),
      role: t("public.home.stories.s1role"),
      location: t("public.home.stories.s1loc"),
      quote:
        t("public.home.stories.s1q"),
      category: "Agency Banking Network",
      icon: <Building2 className="w-4 h-4 text-emerald-400" />,
      tag: t("public.home.stories.s1tag"),
    },
    {
      name: t("public.home.stories.s2name"),
      role: t("public.home.stories.s2role"),
      location: t("public.home.stories.s2loc"),
      quote:
        t("public.home.stories.s2q"),
      category: "Cross-Border Trade",
      icon: <Repeat2 className="w-4 h-4 text-amber-400" />,
      tag: t("public.home.stories.s2tag"),
    },
    {
      name: t("public.home.stories.s3name"),
      role: t("public.home.stories.s3role"),
      location: t("public.home.stories.s3loc"),
      quote:
        t("public.home.stories.s3q"),
      category: "Enterprise Developer",
      icon: <Briefcase className="w-4 h-4 text-teal-400" />,
      tag: t("public.home.stories.s3tag"),
    },
  ];

  return (
    <section className="py-20 lg:py-28 relative kp-band-cool text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-white/10 text-xs font-mono text-emerald-400 mb-3">
            <span>{t("public.home.stories.badge")}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {t("public.home.stories.heading")}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            {t("public.home.stories.intro")}
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stories.map((s, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-3xl glass-02 border border-[var(--border-strong)] shadow-xl flex flex-col justify-between hover:border-emerald-500/30 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-slate-800 border border-white/5">{s.icon}</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase">
                      {s.tag}
                    </span>
                  </div>
                  <Quote className="w-6 h-6 text-slate-700" />
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic mb-6">
                  &ldquo;{s.quote}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="text-sm font-bold text-white">{s.name}</div>
                <div className="text-xs text-slate-400">{s.role}</div>
                <div className="text-[11px] font-mono text-amber-400/90 mt-1">{s.location}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsStories;
