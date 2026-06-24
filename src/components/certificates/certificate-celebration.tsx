'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Award, Download, ExternalLink, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CertificateRenderer } from './certificate-renderer';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import type { CertificateDisplay } from '@/lib/content/certificate-display';

interface CertificateCelebrationProps {
  open: boolean;
  onClose: () => void;
  display: CertificateDisplay | null;
  institutionSlug?: string;
  /** When provided, shows a "View in My Certificates" button. */
  onViewCertificates?: () => void;
}

const CONFETTI_COLORS = ['#DC2626', '#0099CA', '#1E3A5F', '#FFD700', '#22C55E', '#F0E7CC'];

/** Denser, full-bleed confetti burst — pure CSS, no external deps. */
function CelebrationConfetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.4 + Math.random() * 1.8,
        drift: (Math.random() - 0.5) * 140,
        size: 5 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 720,
        isCircle: Math.random() > 0.5,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className={p.isCircle ? 'rounded-full' : 'rounded-[1px]'}
          style={
            {
              position: 'absolute',
              top: '-5%',
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: 0,
              '--cc-drift': `${p.drift}px`,
              '--cc-rotate': `${p.rotate}deg`,
              animation: `cc-fall ${p.duration}s cubic-bezier(0.2, 0.6, 0.4, 1) ${p.delay}s forwards`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function CertificateCelebration({
  open,
  onClose,
  display,
  institutionSlug,
  onViewCertificates,
}: CertificateCelebrationProps) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(0.5);

  const branding = useMemo(() => getInstitutionBranding(institutionSlug), [institutionSlug]);
  const accent = branding.accentColor || branding.primaryColor || '#1E3A5F';
  const glow = branding.primaryColor || '#1E3A5F';

  useEffect(() => setMounted(true), []);

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Responsively scale the certificate to fit the viewport.
  const template = display?.template ?? null;
  useEffect(() => {
    if (!open || !template) return;
    const { width, height } = template.layout_config;
    const compute = () => {
      const maxW = Math.min(window.innerWidth * 0.9, 760);
      const maxH = window.innerHeight * 0.52;
      setScale(Math.max(0.2, Math.min(maxW / width, maxH / height)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [open, template]);

  if (!open || !mounted || !display) return null;

  const certNumber = display.data.certificate_number;

  const handleDownload = () => {
    window.open(`/api/certificates/${display.certificateId}/pdf`, '_blank');
  };

  const handleShare = async () => {
    if (!certNumber) return;
    await navigator.clipboard.writeText(`${window.location.origin}/verify/${certNumber}`);
    toast.success('Verification link copied!');
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Certificate earned"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
    >
      <style>{`
        @keyframes cc-fall {
          0%   { opacity: 1; transform: translateY(0) translateX(0) rotate(0deg); }
          85%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(105vh) translateX(var(--cc-drift)) rotate(var(--cc-rotate)); }
        }
        @keyframes cc-backdrop { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cc-reveal {
          0%   { opacity: 0; transform: perspective(1400px) rotateX(22deg) scale(0.7) translateY(48px); }
          55%  { opacity: 1; transform: perspective(1400px) rotateX(0deg) scale(1.035) translateY(0); }
          100% { opacity: 1; transform: perspective(1400px) rotateX(0deg) scale(1) translateY(0); }
        }
        @keyframes cc-shine { 0% { transform: translateX(-130%) skewX(-18deg); } 100% { transform: translateX(230%) skewX(-18deg); } }
        @keyframes cc-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cc-halo { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.06); } }
        .cc-card { animation: cc-reveal 0.95s cubic-bezier(0.16, 1, 0.3, 1) both; transform-style: preserve-3d; }
        .cc-shine { animation: cc-shine 1.15s ease-in-out 0.75s 1 both; }
        .cc-rise { animation: cc-rise 0.5s ease-out both; }
        .cc-halo { animation: cc-halo 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cc-card, .cc-rise { animation: cc-backdrop 0.4s ease-out both; }
          .cc-shine, .cc-halo { animation: none; }
        }
      `}</style>

      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          animation: 'cc-backdrop 0.35s ease-out both',
          background: `radial-gradient(circle at 50% 35%, ${glow}26, rgba(2,6,23,0.92) 70%)`,
          backdropFilter: 'blur(6px)',
        }}
      />

      <CelebrationConfetti />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-1 right-0 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <p
          className="cc-rise text-xs font-black uppercase tracking-[0.3em] text-white/70"
          style={{ animationDelay: '0.15s' }}
        >
          Certificate Earned
        </p>
        <h2
          className="cc-rise mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl"
          style={{ animationDelay: '0.25s' }}
        >
          Congratulations!
        </h2>
        <p
          className="cc-rise mt-1.5 max-w-md text-sm text-white/75 sm:text-base"
          style={{ animationDelay: '0.32s' }}
        >
          You&apos;ve completed{' '}
          <span className="font-bold text-white">{display.courseTitle}</span>.
        </p>

        {/* Certificate (or medallion fallback) */}
        <div className="cc-card relative mt-6">
          <div
            className="cc-halo absolute -inset-6 -z-10 rounded-3xl"
            style={{ background: `radial-gradient(ellipse at center, ${accent}66, transparent 70%)` }}
            aria-hidden="true"
          />
          {template ? (
            <div className="relative overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/15">
              <CertificateRenderer
                template={template}
                data={display.data}
                scale={scale}
                showQR
                institutionSlug={institutionSlug}
              />
              {/* Shine sweep */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div
                  className="cc-shine absolute inset-y-0 -left-1/3 w-1/3"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-48 w-72 flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 shadow-2xl ring-1 ring-white/20">
              <Award className="h-16 w-16 text-white drop-shadow" />
              <span className="text-sm font-black uppercase tracking-widest text-white/90">
                Certificate Issued
              </span>
            </div>
          )}
        </div>

        {certNumber && (
          <p
            className="cc-rise mt-4 font-mono text-xs text-white/50"
            style={{ animationDelay: '0.5s' }}
          >
            Certificate #{certNumber}
          </p>
        )}

        {/* Actions */}
        <div
          className="cc-rise mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center"
          style={{ animationDelay: '0.6s' }}
        >
          {onViewCertificates && (
            <Button
              onClick={onViewCertificates}
              className="font-bold text-white hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              View in My Certificates
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDownload}
            className="border-white/30 bg-white/10 font-bold text-white hover:bg-white/20 hover:text-white"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download PDF
          </Button>
          {certNumber && (
            <Button
              variant="outline"
              onClick={handleShare}
              className="border-white/30 bg-white/10 font-bold text-white hover:bg-white/20 hover:text-white"
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </Button>
          )}
        </div>

        <button
          onClick={onClose}
          className="cc-rise mt-4 text-sm font-medium text-white/55 transition-colors hover:text-white/90"
          style={{ animationDelay: '0.7s' }}
        >
          Continue
        </button>
      </div>
    </div>,
    document.body,
  );
}
