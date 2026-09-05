'use client';

/* Lightweight, dependency-free SVG charts for the compliance portal. */
import React from 'react';

export const TONE_HEX: Record<string, string> = {
  low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#e11d48',
  ok: '#10b981', warn: '#f59e0b', info: '#0ea5e9', brand: '#0d9488', dim: '#94a3b8',
};

export function useThemeColors() {
  const [hex, setHex] = React.useState<Record<string, string>>(TONE_HEX);
  React.useEffect(() => {
    const dark = document.documentElement.classList.contains('dark');
    const ob = { ...TONE_HEX };
    if (dark) {
      ob.low = '#34d399'; ob.medium = '#fbbf24'; ob.high = '#fb923c'; ob.critical = '#fb7185';
      ob.ok = '#34d399'; ob.warn = '#fbbf24'; ob.info = '#38bdf8'; ob.brand = '#2dd4bf'; ob.dim = '#64748b';
    }
    setHex(ob);
  }, []);
  return hex;
}

export interface Seg { label: string; value: number; color?: string; }

export const Donut: React.FC<{ segs: Seg[]; size?: number; thickness?: number; centerTop?: React.ReactNode; centerSub?: React.ReactNode; className?: string }> = ({ segs, size = 190, thickness = 20, centerTop, centerSub, className }) => {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segs.reduce((a, b) => a + b.value, 0) || 1;
  let acc = 0;
  return (
    <div className={`relative inline-flex items-center justify-center ${className ?? ''}`} style={{ width: size, height: size }} role="img" aria-label={`Donut: ${segs.map((s) => `${s.label} ${s.value}`).join(', ')}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(var(--kpc-ring),0.45)" strokeWidth={thickness} />
        {segs.map((s) => {
          const frac = s.value / total;
          const dash = frac * c;
          const off = -acc * c;
          acc += frac;
          return <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color ?? TONE_HEX.brand} strokeWidth={thickness} strokeDasharray={`${Math.max(dash - 2, 0.5)} ${c - Math.max(dash - 2, 0.5)}`} strokeDashoffset={off} strokeLinecap="round" />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        {centerTop ?? <span className="text-[1.35rem] font-extrabold kpc-num text-[var(--kpc-ink)]">{total.toLocaleString()}</span>}
        {centerSub && <span className="text-[0.62rem] font-bold uppercase tracking-wider text-[var(--kpc-ink-3)] mt-0.5">{centerSub}</span>}
      </div>
    </div>
  );
};

export const Bars: React.FC<{ data: { label: string; value: number; color?: string; valueLabel?: string }[]; height?: number; className?: string; ariaLabel?: string }> = ({ data, height = 150, className, ariaLabel }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const [w, h] = [340, height];
  const bw = w / Math.max(data.length, 1);
  return (
    <div className={className}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img" aria-label={ariaLabel}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={w} y1={h - f * (h - 26)} y2={h - f * (h - 26)} stroke="rgba(var(--kpc-ring),0.4)" strokeWidth={0.6} strokeDasharray="2 3" />
        ))}
        {data.map((d, i) => {
          const bh = Math.max((d.value / max) * (h - 30), 2);
          return <rect key={i} x={i * bw + bw * 0.18} y={h - bh - 24} width={bw * 0.64} height={bh} rx={3} fill={d.color ?? TONE_HEX.brand} />;
        })}
      </svg>
      <div className="flex justify-between mt-1 text-[0.58rem] font-bold text-[var(--kpc-ink-3)] uppercase tracking-wide overflow-hidden" aria-hidden>
        {data.map((d, i) => <span key={i} className="flex-1 truncate px-0.5 text-center">{d.label}</span>)}
      </div>
    </div>
  );
};

export const HBarRows: React.FC<{ rows: { label: React.ReactNode; value: number; count: React.ReactNode; pct?: number; color?: string; right?: React.ReactNode }[] }> = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-[0.72rem] mb-1 gap-2">
            <span className="font-bold text-[var(--kpc-ink-2)] flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color ?? TONE_HEX.brand }} />
              <span className="truncate">{r.label}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              {r.right}
              <span className="kpc-num font-extrabold text-[var(--kpc-ink)]">{r.count}</span>
              {r.pct !== undefined && <span className="text-[0.64rem] text-[var(--kpc-ink-3)] font-semibold w-10 text-right">{(r.pct).toFixed(0)}%</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[rgba(var(--kpc-ring),0.4)] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max((r.value / max) * 100, 2)}%`, background: r.color ?? TONE_HEX.brand }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const Sparkline: React.FC<{ values: number[]; color?: string; width?: number; height?: number; className?: string; fill?: boolean }> = ({ values, color = TONE_HEX.brand, width = 120, height = 36, className, fill }) => {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => [ (i / (values.length - 1 || 1)) * width, height - 3 - ((v - min) / range) * (height - 6) ]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} className={className} role="img" aria-label="Trend">
      {fill && <path d={area} fill={color} opacity={0.12} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

export const Legend: React.FC<{ items: { label: React.ReactNode; color: string; count?: React.ReactNode }[]; className?: string }> = ({ items, className }) => (
  <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className ?? ''}`}>
    {items.map((it, i) => (
      <span key={i} className="inline-flex items-center gap-1.5 text-[0.68rem] font-bold text-[var(--kpc-ink-2)]">
        <span className="w-2.5 h-2.5 rounded-[4px] inline-block" style={{ background: it.color }} />
        {it.label}
        {it.count !== undefined && <span className="kpc-num text-[var(--kpc-ink-3)]">{it.count}</span>}
      </span>
    ))}
  </div>
);
