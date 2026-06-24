import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CertificateCelebration } from './certificate-celebration';
import type { CertificateDisplay } from '@/lib/content/certificate-display';
import type { CertificateTemplate } from '@/types';

function makeTemplate(): CertificateTemplate {
  return {
    id: 'tpl-1',
    institution_id: 'inst-1',
    name: 'Default',
    description: null,
    canva_design_id: null,
    canva_design_url: null,
    layout_config: {
      width: 1056,
      height: 816,
      orientation: 'landscape',
      fields: {
        student_name: { x: 0, y: 300, fontSize: 36, color: '#000', align: 'center' },
        course_title: { x: 0, y: 360, fontSize: 24, color: '#000', align: 'center' },
        completion_date: { x: 0, y: 400, fontSize: 18, color: '#000', align: 'center' },
        certificate_number: { x: 0, y: 500, fontSize: 12, color: '#000', align: 'right' },
        institution_name: { x: 0, y: 440, fontSize: 14, color: '#000', align: 'center' },
      },
    },
    is_default: true,
    created_by: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

function makeDisplay(overrides: Partial<CertificateDisplay> = {}): CertificateDisplay {
  return {
    certificateId: 'cert-1',
    template: makeTemplate(),
    data: {
      student_name: 'Jordan Rivers',
      course_title: 'Sickle Cell 101',
      completion_date: 'June 23, 2026',
      certificate_number: 'SCAGO-2026-00042',
      institution_name: 'SCAGO',
    },
    courseTitle: 'Sickle Cell 101',
    ...overrides,
  };
}

describe('CertificateCelebration', () => {
  it('renders nothing when closed', () => {
    render(<CertificateCelebration open={false} onClose={() => {}} display={makeDisplay()} />);
    expect(screen.queryByText('Congratulations!')).toBeNull();
  });

  it('renders nothing when there is no display', () => {
    render(<CertificateCelebration open onClose={() => {}} display={null} />);
    expect(screen.queryByText('Congratulations!')).toBeNull();
  });

  it('reveals the actual certificate with the heading, course, and number', () => {
    render(
      <CertificateCelebration open onClose={() => {}} display={makeDisplay()} institutionSlug="scago" />,
    );
    expect(screen.getByText('Certificate Earned')).toBeInTheDocument();
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
    // course title appears both in the headline and on the rendered certificate
    expect(screen.getAllByText(/Sickle Cell 101/).length).toBeGreaterThan(0);
    // the real certificate fields render (not just an icon)
    expect(screen.getByText('Jordan Rivers')).toBeInTheDocument();
    expect(screen.getByText(/Certificate #SCAGO-2026-00042/)).toBeInTheDocument();
  });

  it('shows the medallion fallback when no template resolves', () => {
    render(<CertificateCelebration open onClose={() => {}} display={makeDisplay({ template: null })} />);
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
    expect(screen.getByText('Certificate Issued')).toBeInTheDocument();
    // no rendered certificate name in the fallback
    expect(screen.queryByText('Jordan Rivers')).toBeNull();
  });

  it('shows "View in My Certificates" only when the handler is provided', () => {
    const { rerender } = render(
      <CertificateCelebration open onClose={() => {}} display={makeDisplay()} />,
    );
    expect(screen.queryByRole('button', { name: /View in My Certificates/ })).toBeNull();

    rerender(
      <CertificateCelebration
        open
        onClose={() => {}}
        display={makeDisplay()}
        onViewCertificates={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /View in My Certificates/ })).toBeInTheDocument();
  });

  it('hides Share and the number when there is no certificate number', () => {
    render(
      <CertificateCelebration
        open
        onClose={() => {}}
        display={makeDisplay({
          data: {
            student_name: 'Jordan Rivers',
            completion_date: 'June 23, 2026',
            certificate_number: '',
            institution_name: 'SCAGO',
          },
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: /Share/ })).toBeNull();
    expect(screen.queryByText(/Certificate #/)).toBeNull();
  });

  it('calls onClose when Continue is clicked', () => {
    const onClose = vi.fn();
    render(<CertificateCelebration open onClose={onClose} display={makeDisplay()} />);
    fireEvent.click(screen.getByText('Continue'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<CertificateCelebration open onClose={onClose} display={makeDisplay()} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
