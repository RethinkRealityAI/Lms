'use client';

/**
 * Presentational renderer for a landing-page notification (migration 065).
 *
 * Pure and props-driven so it is reused byte-for-byte by BOTH the public landing
 * page (LandingNotification wrapper) and the admin live preview
 * (LandingNotificationsManager). It renders a prominent, accent-tinted banner
 * that sits right below the hero.
 *
 * Links are convention-based:
 *   - '#id'    → smooth-scrolls to an on-page section (e.g. the support section)
 *   - 'http…'  → opens in a new tab
 *   - '/path'  → app route, prefixed with the active institution slug
 * In previewMode nothing navigates (links are inert) so the admin editor is safe.
 */

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Megaphone, Info, Sparkles, Heart, Bell, PartyPopper, ArrowRight, X } from 'lucide-react';
import { withInstitutionPath } from '@/lib/tenant/path';
import type { LandingNotificationIcon } from '@/lib/db/landing-notifications';

export interface LandingNotificationViewData {
  id: string;
  title: string;
  body: string;
  icon: LandingNotificationIcon;
  accent_color: string | null;
  show_logo: boolean;
  cta_label: string | null;
  cta_url: string | null;
  secondary_cta_label: string | null;
  secondary_cta_url: string | null;
  dismissible: boolean;
}

export interface LandingNotificationBranding {
  institutionName: string;
  logoUrl: string | null;
  /** Fallback accent when the row has no accent_color. */
  primaryColor: string;
}

interface LandingNotificationViewProps {
  notification: LandingNotificationViewData;
  branding: LandingNotificationBranding;
  onDismiss?: () => void;
  /** Admin live preview — links are inert, no smooth-scroll/navigation. */
  previewMode?: boolean;
}

const ICONS: Record<LandingNotificationIcon, React.ComponentType<{ className?: string }> | null> = {
  megaphone: Megaphone,
  info: Info,
  sparkles: Sparkles,
  heart: Heart,
  bell: Bell,
  party: PartyPopper,
  none: null,
};

/** Append an 8-digit hex alpha to a #rrggbb accent for soft tints; pass others through. */
function tint(hex: string, alpha: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  return m ? `#${m[1]}${alpha}` : hex;
}

function interpolate(text: string, institutionName: string): string {
  return text.replaceAll('{{institutionName}}', institutionName);
}

export function LandingNotificationView({
  notification,
  branding,
  onDismiss,
  previewMode = false,
}: LandingNotificationViewProps) {
  const pathname = usePathname();
  const accent = notification.accent_color || branding.primaryColor;
  const Icon = ICONS[notification.icon];
  const title = interpolate(notification.title, branding.institutionName);
  const paragraphs = interpolate(notification.body, branding.institutionName)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  /** Resolve a configured url into a real href (or undefined for anchors we intercept). */
  const hrefFor = (url: string): string | undefined => {
    if (url.startsWith('#')) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return withInstitutionPath(url, pathname);
    return url;
  };

  const handleLink = (url: string) => (e: React.MouseEvent) => {
    if (previewMode) {
      e.preventDefault();
      return;
    }
    if (url.startsWith('#')) {
      e.preventDefault();
      const el = typeof document !== 'undefined' ? document.querySelector(url) : null;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const showLogo = notification.show_logo && branding.logoUrl;

  return (
    <motion.div
      initial={previewMode ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-[1.75rem] border shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)]"
      style={{
        borderColor: tint(accent, '33'),
        background: `linear-gradient(135deg, ${tint(accent, '14')} 0%, #ffffff 60%)`,
      }}
      role="status"
    >
      {/* Accent side rail */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: accent }} />

      <div className="flex items-start gap-4 sm:gap-5 p-5 sm:p-6 pl-6 sm:pl-8">
        {/* Icon / logo bubble */}
        {(Icon || showLogo) && (
          <div
            className="shrink-0 mt-0.5 rounded-2xl p-3 shadow-sm"
            style={{ backgroundColor: tint(accent, '1f') }}
          >
            {showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl!} alt={`${branding.institutionName} logo`} className="h-7 w-auto object-contain" />
            ) : Icon ? (
              <span style={{ color: accent }}><Icon className="h-6 w-6" /></span>
            ) : null}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight tracking-tight">
            {title}
          </h3>
          <div className="mt-2 space-y-2">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-sm sm:text-[15px] text-slate-600 font-medium leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          {(notification.cta_label && notification.cta_url) || (notification.secondary_cta_label && notification.secondary_cta_url) ? (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              {notification.cta_label && notification.cta_url && (
                <a
                  href={hrefFor(notification.cta_url)}
                  onClick={handleLink(notification.cta_url)}
                  target={/^https?:\/\//i.test(notification.cta_url) ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all hover:opacity-90"
                  style={{ backgroundColor: accent }}
                >
                  {notification.cta_label}
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
              {notification.secondary_cta_label && notification.secondary_cta_url && (
                <a
                  href={hrefFor(notification.secondary_cta_url)}
                  onClick={handleLink(notification.secondary_cta_url)}
                  target={/^https?:\/\//i.test(notification.secondary_cta_url) ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-4 hover:opacity-80 transition-opacity"
                  style={{ color: accent }}
                >
                  {notification.secondary_cta_label}
                </a>
              )}
            </div>
          ) : null}
        </div>

        {notification.dismissible && (
          <button
            type="button"
            onClick={() => onDismiss?.()}
            aria-label="Dismiss notification"
            className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
