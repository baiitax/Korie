'use client';

import React, { useState } from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { BookOpen, Search, Filter, ThumbsUp, Layers, Tag } from 'lucide-react';

export default function KnowledgeBasePage() {
  const { knowledgeArticles, locale } = useSupport();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<'ALL' | 'en' | 'ha' | 'fr'>('ALL');

  const filtered = knowledgeArticles.filter((kb) => {
    if (selectedLang !== 'ALL' && kb.language !== selectedLang) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        kb.title.toLowerCase().includes(q) ||
        kb.problem.toLowerCase().includes(q) ||
        kb.resolution.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            TRILINGUAL SERVICE REPOSITORY
          </div>
          <h1 className="text-2xl font-extrabold text-white">Support Knowledge Base</h1>
          <p className="text-xs text-slate-400">
            Approved standard resolution procedures in English, Hausa, and French.
          </p>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800 self-start md:self-auto">
          {(['ALL', 'en', 'ha', 'fr'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition ${
                selectedLang === lang
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title, keywords, or error codes..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((kb) => (
          <div
            key={kb.id}
            className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                  {kb.category.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono font-bold uppercase">
                  {kb.language} • v{kb.version}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{kb.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{kb.problem}</p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl space-y-1.5 text-xs">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Standard Resolution:</span>
                <p className="text-slate-200 whitespace-pre-wrap leading-relaxed text-[11px]">{kb.resolution}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono text-[11px]">Updated {kb.updatedAt}</span>
              <span className="text-teal-400 font-bold flex items-center gap-1 font-mono text-[11px]">
                <ThumbsUp className="w-3.5 h-3.5" />
                {kb.helpfulCount} helpful
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
