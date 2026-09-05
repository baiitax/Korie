'use client';

/**
 * Portal settings — deliberately small, and security-first.
 *
 * Only three things can be changed here, because only three things this console
 * actually owns: which jurisdiction the queues are scoped to, the language the
 * interface renders in, and light or dark. Each writes to a real store the shell
 * reads, and each is confirmed on screen by the state itself rather than by a
 * toast.
 *
 * Identity settings (password, MFA factors, sessions) are *shown* here and
 * *changed* in the security module, because the compliance portal has no write
 * route for them. The posture panel is `/api/security/posture` read live, so the
 * officer can see the cost of a configuration change without leaving the desk.
 */

import Link from 'next/link';
import React from 'react';
import { ArrowRight, Check, Globe, KeyRound, Moon, ShieldCheck, Sun, Users } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { SecurityPostureRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import type { JurisdictionFilter } from '@/services/compliance/jurisdiction';
import { useLanguage } from '@/components/ui/LanguageContext';
import { useTheme } from '@/components/ui/ThemeContext';
import { Button, Chip, KeyList, PageHead, Panel, Provenance, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { InlineNotice, LoadingBlock, StateCard } from '@/components/compliance/ui';

const JURISDICTIONS: { value: JurisdictionFilter; label: string }[] = [
  { value: 'ALL', label: 'All jurisdictions' },
  { value: 'NG', label: 'Nigeria (NG)' },
  { value: 'NE', label: 'Niger (NE)' },
];
const LANGUAGES: { value: 'en' | 'fr' | 'ha'; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ha', label: 'Hausa' },
];

export default function ComplianceSettingsPage() {
  const { t, locale, jurisdiction, setJurisdiction, session, sessionLoading, mode, demoEnabled } = useCompliancePortal();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const posture = useComplianceResource('posture');
  const health = useComplianceResource('systemHealth');

  const report = posture.resource.data[0] as SecurityPostureRow | undefined;
  const platform = health.resource.data[0];

  return (
    <>
      <PageHead
        title={t('compliance.settings.title')}
        description={t('compliance.settings.subtitle')}
        resource={posture.resource}
        actions={
          <Link href="/compliance/system-health" className="cmp-btn">
            {t('compliance.nav.systemHealth')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <Panel title={t('compliance.settings.securityTitle')} subtitle={t('compliance.settings.securitySubtitle')}>
            {posture.isLoading ? (
              <LoadingBlock label={t('compliance.settings.postureLoading')} variant="detail" rows={3} />
            ) : !report ? (
              <StateCard
                tone={posture.resource.status === 'unauthorized' ? 'neutral' : 'danger'}
                icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
                title={posture.resource.status === 'unauthorized' ? t('compliance.states.unauthorizedTitle') : t('compliance.settings.postureUnavailable')}
              >
                {posture.resource.error?.message ?? t('compliance.settings.postureUnavailableBody')}
              </StateCard>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[26px] font-extrabold leading-none tabular text-[var(--foreground)]">{report.compositeScore}</span>
                  <span className="text-[12px] text-[var(--foreground-muted)]">/ 100</span>
                  <Chip tone="clear" icon={<Check className="h-3 w-3" aria-hidden="true" />}>
                    {humanizeEnum(report.tier)}
                  </Chip>
                  <span className="cmp-ref ml-auto">{formatDate(report.evaluatedAt, 'full', { locale })}</span>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {report.dimensions.map((dimension) => (
                    <li key={dimension.name} className="py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[12.5px] font-bold text-[var(--foreground)]">{dimension.name}</span>
                        <span className="flex items-center gap-2">
                          <StatusChip status={dimension.status} label={humanizeEnum(dimension.status)} />
                          <span className="tabular text-[12.5px] font-bold text-[var(--foreground)]">{dimension.score}</span>
                          {typeof dimension.weight === 'number' ? (
                            <span className="tabular text-[11px] text-[var(--text-disabled)]">w {dimension.weight.toFixed(2)}</span>
                          ) : null}
                        </span>
                      </div>
                      {dimension.details ? (
                        <p className="mt-0.5 text-[11.5px] leading-[1.5] text-[var(--foreground-muted)]">{dimension.details}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <Provenance resource={posture.resource} detail={t('compliance.settings.postureProvenance')} />
              </div>
            )}
          </Panel>

          <Panel title={t('compliance.settings.preferencesTitle')} subtitle={t('compliance.settings.preferencesSubtitle')}>
            <div className="space-y-4">
              <Group
                label={t('compliance.settings.jurisdiction')}
                hint={t('compliance.settings.jurisdictionHint')}
                options={JURISDICTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                  selected: jurisdiction === option.value,
                  onSelect: () => setJurisdiction(option.value),
                }))}
              />
              <Group
                label={t('compliance.settings.language')}
                hint={t('compliance.settings.languageHint')}
                options={LANGUAGES.map((option) => ({
                  value: option.value,
                  label: option.label,
                  selected: language === option.value,
                  onSelect: () => setLanguage(option.value),
                }))}
              />
              <Group
                label={t('compliance.settings.theme')}
                hint={t('compliance.settings.themeHint')}
                options={[
                  { value: 'light', label: t('compliance.settings.themeLight'), selected: theme === 'light', onSelect: () => setTheme('light'), icon: <Sun className="h-3.5 w-3.5" aria-hidden="true" /> },
                  { value: 'dark', label: t('compliance.settings.themeDark'), selected: theme === 'dark', onSelect: () => setTheme('dark'), icon: <Moon className="h-3.5 w-3.5" aria-hidden="true" /> },
                ]}
              />
              <InlineNotice tone={demoEnabled ? 'warning' : 'neutral'} icon={<Globe className="h-4 w-4" aria-hidden="true" />}>
                {t('compliance.settings.modeNotice', { mode: mode.toUpperCase() })}
              </InlineNotice>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title={t('compliance.settings.accountTitle')}
            actions={
              <Button variant="ghost" className="px-2" onClick={() => posture.reload()} pending={posture.isLoading || posture.isRefreshing}>
                {posture.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
              </Button>
            }
          >
            {sessionLoading ? (
              <LoadingBlock label={t('compliance.settings.sessionLoading')} variant="detail" rows={2} />
            ) : (
              <KeyList
                items={[
                  { term: t('compliance.settings.name'), value: session?.displayName ?? t('compliance.shell.notReported') },
                  { term: t('compliance.settings.email'), value: session?.email ?? t('compliance.shell.notReported') },
                  { term: t('compliance.settings.department'), value: session?.department ?? t('compliance.shell.notReported') },
                  {
                    term: t('compliance.settings.roles'),
                    value: session?.roles?.length ? session.roles.map(humanizeEnum).join(' · ') : t('compliance.shell.notReported'),
                  },
                  { term: t('compliance.settings.assurance'), value: session?.assuranceLevel ?? t('compliance.shell.notReported') },
                  { term: t('compliance.settings.mfa'), value: session?.mfaMethod ? `${humanizeEnum(session.mfaMethod)}${session.mfaEnforced ? ` · ${t('compliance.settings.enforced')}` : ''}` : t('compliance.shell.notReported') },
                  { term: t('compliance.settings.device'), value: session?.deviceTrust ? humanizeEnum(session.deviceTrust) : t('compliance.shell.notReported') },
                  {
                    term: t('compliance.settings.sessions'),
                    value: typeof session?.activeSessions === 'number' ? t('compliance.settings.sessionsCount', { count: session.activeSessions }) : t('compliance.shell.notReported'),
                  },
                ]}
              />
            )}
            {session?.unavailableReason ? <InlineNotice tone="warning">{session.unavailableReason}</InlineNotice> : null}
            <div className="mt-3 space-y-2">
              <p className="text-[11.5px] leading-[1.5] text-[var(--foreground-muted)]">{t('compliance.settings.accountNote')}</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/mfa" className="cmp-btn cmp-btn--ghost px-2">
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('compliance.settings.manageMfa')}
                </Link>
                <Link href="/compliance/team" className="cmp-btn cmp-btn--ghost px-2">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('compliance.nav.team')}
                </Link>
              </div>
            </div>
          </Panel>

          <Panel title={t('compliance.settings.platformTitle')} footnote={<Provenance resource={health.resource} />}>
            {platform ? (
              <KeyList
                items={[
                  { term: t('compliance.health.platform'), value: <StatusChip status={platform.platformStatus} label={humanizeEnum(platform.platformStatus)} severity={platform.platformStatus !== 'OPERATIONAL'} /> },
                  { term: t('compliance.health.database'), value: <StatusChip status={platform.database.status} label={humanizeEnum(platform.database.status)} /> },
                  { term: t('compliance.health.ledger'), value: <StatusChip status={platform.ledger.status} label={humanizeEnum(platform.ledger.status)} /> },
                  { term: t('compliance.settings.safeMode'), value: platform.safeMode ? t('compliance.settings.safeModeOn') : t('compliance.settings.safeModeOff') },
                ]}
              />
            ) : (
              <p className="text-[12.5px] text-[var(--foreground-muted)]">{t('compliance.settings.platformUnavailable')}</p>
            )}
          </Panel>

          <Panel title={t('compliance.settings.notHereTitle')}>
            <ul className="space-y-1.5 text-[12.5px] leading-[1.5] text-[var(--foreground-muted)]">
              {[t('compliance.settings.notHere1'), t('compliance.settings.notHere2'), t('compliance.settings.notHere3'), t('compliance.settings.notHere4')].map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  {line}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          { section: t('compliance.settings.securityTitle'), source: 'GET /api/security/posture → SecurityPostureService', note: t('compliance.settings.sourceNotePosture'), mode: 'live' },
          { section: t('compliance.settings.accountTitle'), source: 'GET /api/security/me (session view, no write route)', note: t('compliance.settings.sourceNoteSession'), mode: 'live' },
          {
            section: t('compliance.settings.preferencesTitle'),
            source: 'localStorage: kp_compliance_jurisdiction · koriepay_lang · koriepay_theme',
            note: t('compliance.settings.sourceNotePrefs'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}

const Group: React.FC<{
  label: string;
  hint: string;
  options: { value: string; label: string; selected: boolean; onSelect: () => void; icon?: React.ReactNode }[];
}> = ({ label, hint, options }) => (
  <div>
    <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
      <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">{label}</span>
      <span className="text-[11.5px] text-[var(--text-disabled)]">{hint}</span>
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={option.onSelect}
          aria-pressed={option.selected}
          className="cmp-btn"
          data-variant={option.selected ? 'primary' : undefined}
        >
          {option.icon}
          {option.label}
          {option.selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        </button>
      ))}
    </div>
  </div>
);
