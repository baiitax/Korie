'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Settings, ShieldCheck, Bell, Palette, Languages, UserCog, KeyRound, Fingerprint, MonitorSmartphone, History, Trash2, Check } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, PageHead, useBoot, PageSkel, KeyVal, Avatar, Chip, Input } from '@/components/compliance/ui/Ck';
import { DemoStrip } from '@/components/compliance/workspaces/helpers';

const TABS = ['profile', 'security', 'notifications', 'appearance', 'language', 'permissions'] as const;
function SettingsInner() {
  const sp = useSearchParams();
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(400);
  const [tab, setTab] = useState<(typeof TABS)[number]>('profile');
  useEffect(() => { const v = sp.get('tab'); if (v && (TABS as readonly string[]).includes(v)) setTab(v as typeof tab); }, [sp]);
  const [pwd, setPwd] = useState({ cur: '', nw: '', cf: '' });
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [prefs, setPrefs] = useState({ ccy: 'XOF', country: 'ALL' });
  const [notif, setNotif] = useState({ email: true, push: true, digest: false });
  if (!ready) return <PageSkel />;
  const changePwd = () => {
    if (!pwd.cur || pwd.nw.length < 8) { setPwdMsg({ ok: false, text: t.setP.pwdRules }); return; }
    if (pwd.nw !== pwd.cf) { setPwdMsg({ ok: false, text: t.setP.pwdError }); return; }
    setPwdMsg({ ok: true, text: t.setP.pwdChanged }); setPwd({ cur: '', nw: '', cf: '' });
    p.pushToast('ok', t.setP.changePassword, t.setP.pwdChanged, false);
  };
  const savePrefs = () => { setPrefs({ ...prefs }); p.pushToast('ok', t.setP.prefsSave, t.setP.prefsSaved, false); };
  const tabLabel = (k: string) => ({ profile: t.setP.profile, security: t.setP.security, notifications: t.setP.notifications, appearance: t.setP.appearance, language: t.setP.language, permissions: t.setP.permissions }[k] ?? k);
  return (
    <div>
      <PageHead icon={Settings} title={t.setP.title} sub={t.setP.subtitle} />
      <div className="flex flex-col lg:flex-row gap-4">
        <nav aria-label={t.setP.title} className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:w-52 shrink-0 lg:sticky lg:top-20 self-start w-full">
          {TABS.map((k) => {
            const Icons = { profile: Settings, security: Fingerprint, notifications: Bell, appearance: Palette, language: Languages, permissions: ShieldCheck } as const;
            const Icon = Icons[k];
            return <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.76rem] font-bold whitespace-nowrap transition ${tab === k ? 'bg-teal-500/10 text-[var(--kpc-brand-ink)] border border-teal-500/25' : 'text-[var(--kpc-ink-2)] border border-transparent hover:bg-[rgba(var(--kpc-ring),0.35)]'}`}>
              <Icon className="w-4 h-4" />{tabLabel(k)}</button>;
          })}
        </nav>
        <div className="flex-1 min-w-0">
          {tab === 'profile' && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={p.currentOfficer.fullName} size={48} />
                <div><p className="text-[0.92rem] font-extrabold text-[var(--kpc-ink)]">{p.currentOfficer.fullName}</p>
                  <p className="text-[0.7rem] font-bold text-[var(--kpc-ink-2)]">{p.currentOfficer.role.replace(/_/g, ' ')} · {p.currentOfficer.jurisdiction}</p></div>
                <Chip tone="brand" className="ml-auto">{p.currentOfficer.id}</Chip>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                <KeyVal k={t.setP.fullName} v={p.currentOfficer.fullName} />
                <KeyVal k={t.setP.role} v={p.currentOfficer.role.replace(/_/g, ' ')} />
                <KeyVal k={t.setP.email} v={p.currentOfficer.email.replace(/^(.).+@/, '$1•••••@')} />
                <KeyVal k={t.setP.sessionDetail} v={p.currentOfficer.id} />
              </div>
              <div className="mt-4 kpc-inset rounded-xl p-3 text-[0.7rem] text-[var(--kpc-ink-3)] font-semibold"><DemoStrip t={t} /></div>
            </Card>
          )}
          {tab === 'security' && (
            <Card>
              <Section icon={ShieldCheck} title={t.setP.twoFactor} body={t.setP.twoFactorBody} badge={<Chip tone="ok">MFA</Chip>} />
              <Section icon={KeyRound} title={t.setP.changePassword} body={t.setP.pwdRules}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input type="password" value={pwd.cur} onChange={(e) => setPwd({ ...pwd, cur: e.target.value })} placeholder={t.setP.currentPh} aria-label={t.setP.current} />
                  <Input type="password" value={pwd.nw} onChange={(e) => setPwd({ ...pwd, nw: e.target.value })} placeholder={t.setP.newPh} aria-label={t.setP.newPassword} />
                  <Input type="password" value={pwd.cf} onChange={(e) => setPwd({ ...pwd, cf: e.target.value })} placeholder={t.setP.confirmPassword} aria-label={t.setP.confirmPassword} />
                </div>
                <button onClick={changePwd} className="kpc-btn kpc-btn-primary kpc-btn-sm mt-3">{t.setP.changePassword}</button>
                {pwdMsg && <p className={`text-[0.7rem] font-bold mt-2 ${pwdMsg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{pwdMsg.text}</p>}
              </Section>
              <Section icon={Fingerprint} title={t.setP.activeSessions} body={t.setP.sessionMasked}>
                <div className="flex items-center gap-2 kpc-inset rounded-lg px-3 py-2 text-[0.7rem] font-semibold text-[var(--kpc-ink-2)] w-fit"><MonitorSmartphone className="w-4 h-4" /> {p.currentOfficer.id} · {t.setP.sessionMasked}</div>
              </Section>
            </Card>
          )}
          {tab === 'notifications' && (
            <Card>
              {([['email', t.setP.notifEmail], ['push', t.setP.notifPush], ['digest', t.setP.notifWeekly]] as const).map(([k, label]) => (
                <label key={k} className="flex items-center justify-between py-2.5 border-b border-[rgba(var(--kpc-ring),0.3)] last:border-0 cursor-pointer">
                  <span className="text-[0.76rem] font-bold text-[var(--kpc-ink-2)]">{label}</span>
                  <input type="checkbox" className="accent-teal-600 w-4 h-4" checked={notif[k]} onChange={(e) => setNotif({ ...notif, [k]: e.target.checked })} />
                </label>
              ))}
              <div className="mt-3"><DemoStrip t={t} /></div>
            </Card>
          )}
          {tab === 'appearance' && (
            <Card>
              <p className="text-[0.74rem] font-semibold text-[var(--kpc-ink-2)] mb-3">{t.setP.appearanceBody} — {t.common.themeDemoHint}</p>
              <div className="flex gap-2"><button className="kpc-btn kpc-btn-primary" onClick={() => p.pushToast('info', t.setP.appearance, t.setP.appearanceBody, false)}><Palette className="w-4 h-4" /> {t.common.light}</button></div>
              <div className="mt-4 kpc-inset rounded-xl p-3 text-[0.7rem] text-[var(--kpc-ink-3)] font-semibold"><DemoStrip t={t} /></div>
            </Card>
          )}
          {tab === 'language' && (
            <Card>
              <p className="text-[0.74rem] font-semibold text-[var(--kpc-ink-2)] mb-3">{t.setP.languageBody}</p>
              <div className="flex gap-2">
                {(['en', 'fr', 'ha'] as const).map((l) => (
                  <button key={l} onClick={() => p.setLocale(l)} className={`kpc-btn kpc-btn-sm ${p.locale === l ? 'kpc-btn-primary' : 'kpc-btn-outline'}`}>{l.toUpperCase()}{p.locale === l && <Check className="w-3.5 h-3.5 ml-1" />}</button>
                ))}
              </div>
            </Card>
          )}
          {tab === 'permissions' && (
            <Card>
              <Section icon={UserCog} title={t.setP.permsBody} body={`${p.currentOfficer.role.replace(/_/g, ' ')} — ${t.setP.viewOnly}`} />
              <Section icon={Languages} title={t.setP.compliancePrefs} body="">
                <div className="grid grid-cols-2 gap-2 max-w-md">
                  <label className="text-[0.7rem] font-bold text-[var(--kpc-ink-2)]">{t.setP.prefsDefaultCurrency}
                    <select value={prefs.ccy} onChange={(e) => setPrefs({ ...prefs, ccy: e.target.value })} className="kpc-input mt-1"><option value="XOF">XOF (CFA)</option><option value="NGN">NGN (₦)</option></select></label>
                  <label className="text-[0.7rem] font-bold text-[var(--kpc-ink-2)]">{t.setP.prefsDefaultCountry}
                    <select value={prefs.country} onChange={(e) => setPrefs({ ...prefs, country: e.target.value })} className="kpc-input mt-1"><option value="ALL">🇳🇪 NE + 🇳🇬 NG</option><option value="NE">🇳🇪 NE</option><option value="NG">🇳🇬 NG</option></select></label>
                </div>
                <button onClick={savePrefs} className="kpc-btn kpc-btn-primary kpc-btn-sm mt-3">{t.setP.prefsSave}</button>
              </Section>
              <Section icon={History} title={t.setP.history} body={t.setP.sessionMasked}>
                <button onClick={() => p.pushToast('info', t.setP.clearHistory, t.setP.sessionMasked, false)} className="kpc-btn kpc-btn-outline kpc-btn-sm"><Trash2 className="w-3.5 h-3.5" /> {t.setP.clearHistory}</button>
              </Section>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
function Section({ icon: Icon, title, body, badge, children }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; badge?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="py-4 border-b border-[rgba(var(--kpc-ring),0.3)] last:border-0">
      <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4 text-[var(--kpc-brand-ink)]" /><h3 className="text-[0.82rem] font-extrabold text-[var(--kpc-ink)]">{title}</h3>{badge}</div>
      {body && <p className="text-[0.7rem] text-[var(--kpc-ink-3)] font-semibold mb-2">{body}</p>}
      {children}
    </div>
  );
}
export default function SettingsPage() {
  return <Suspense fallback={<PageSkel />}><SettingsInner /></Suspense>;
}
