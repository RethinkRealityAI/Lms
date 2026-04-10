'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { CertificateTemplate, CertificateData, CertificateFieldConfig } from '@/types';

interface CertificateRendererProps {
  template: CertificateTemplate;
  data: CertificateData;
  scale?: number;
  className?: string;
  showQR?: boolean;
}

function FieldText({
  config,
  value,
  containerWidth,
}: {
  config: CertificateFieldConfig;
  value: string;
  containerWidth: number;
}) {
  const style: React.CSSProperties = {
    position: 'absolute',
    top: config.y,
    fontSize: config.fontSize,
    fontWeight: (config.fontWeight as React.CSSProperties['fontWeight']) ?? 'normal',
    color: config.color,
    whiteSpace: 'nowrap',
  };

  if (config.align === 'center') {
    style.left = '50%';
    style.transform = 'translateX(-50%)';
  } else if (config.align === 'right') {
    style.right = containerWidth - config.x;
  } else {
    style.left = config.x;
  }

  return <div style={style}>{value}</div>;
}

export function CertificateRenderer({
  template,
  data,
  scale = 1,
  className = '',
  showQR = true,
}: CertificateRendererProps) {
  const { width, height, fields } = template.layout_config;
  const hasCanvaBackground = !!template.canva_design_url;

  return (
    <div
      className={className}
      style={{
        width: width * scale,
        height: height * scale,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          width,
          height,
          position: 'relative',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        {/* Background layer */}
        {hasCanvaBackground ? (
          <img
            src={template.canva_design_url!}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <DefaultBackground width={width} height={height} />
        )}

        {/* Data fields layer */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {fields.student_name && (
            <FieldText config={fields.student_name} value={data.student_name} containerWidth={width} />
          )}
          {fields.course_title && data.course_title && (
            <FieldText config={fields.course_title} value={data.course_title} containerWidth={width} />
          )}
          {fields.completion_date && (
            <FieldText config={fields.completion_date} value={data.completion_date} containerWidth={width} />
          )}
          {fields.certificate_number && (
            <FieldText config={fields.certificate_number} value={data.certificate_number} containerWidth={width} />
          )}
          {fields.institution_name && (
            <FieldText config={fields.institution_name} value={data.institution_name} containerWidth={width} />
          )}
        </div>

        {/* QR Code */}
        {showQR && data.certificate_number && (
          <div style={{ position: 'absolute', bottom: 30, right: 30 }}>
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${data.certificate_number}`}
              size={80}
              bgColor="transparent"
              fgColor={hasCanvaBackground ? '#000000' : '#FFFFFF'}
              level="M"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultBackground({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)',
      }}
    >
      {/* Decorative border */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
      >
        <rect x="20" y="20" width={width - 40} height={height - 40} rx="4"
          stroke="#D4A843" strokeWidth="2" />
        <rect x="30" y="30" width={width - 60} height={height - 60} rx="2"
          stroke="#DC2626" strokeWidth="1" strokeOpacity="0.4" />
      </svg>

      {/* Header text */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        color: '#D4A843',
        fontSize: 14,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        fontWeight: 600,
      }}>
        Certificate of Completion
      </div>

      {/* Decorative line under header */}
      <div style={{
        position: 'absolute',
        top: 115,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 200,
        height: 1,
        background: 'linear-gradient(90deg, transparent, #D4A843, transparent)',
      }} />

      {/* Bottom red stripe */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 6,
        background: '#DC2626',
        borderRadius: '0 0 4px 4px',
      }} />
    </div>
  );
}
