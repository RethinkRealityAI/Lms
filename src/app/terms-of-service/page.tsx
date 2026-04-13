'use client';

import Link from 'next/link';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { PublicNav } from '@/components/public-nav';
import { resolveInstitutionSlug, withInstitutionPath } from '@/lib/tenant/path';
import { getInstitutionBranding } from '@/lib/tenant/branding';

export default function TermsOfServicePage() {
  const pathname = usePathname();
  const institutionSlug = resolveInstitutionSlug(pathname);
  const branding = getInstitutionBranding(institutionSlug);
  const isScago = institutionSlug === 'scago';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicNav transparentInitially={false} />

      <main className="flex-1 pt-32 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href={withInstitutionPath('/', pathname)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#DC2626] transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Terms of Service</h1>
          <p className="text-sm text-slate-400 font-bold mb-12">Last updated: April 12, 2026</p>

          <div className="prose prose-slate prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-slate-900 [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-800 [&_p]:text-slate-600 [&_p]:leading-relaxed [&_li]:text-slate-600 [&_ul]:space-y-2">

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the {branding.fullName} e-learning platform (&ldquo;Platform&rdquo;), you agree to be bound by these
              Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you may not use the Platform.
              These Terms constitute a legally binding agreement between you and {branding.fullName}.
            </p>
            {isScago && (
              <p>
                {branding.fullName} is a registered Canadian charity (Charitable Registration #: 83332 0872 RR 0001)
                operating from {branding.contactAddress}.
              </p>
            )}

            <h2>2. Account Registration</h2>
            <p>
              To access course materials, you must create an account by providing accurate and complete
              information. You are responsible for:
            </p>
            <ul>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
              <li>Ensuring that your registration information remains accurate and up to date</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms or that
              have been inactive for an extended period, with reasonable notice where possible.
            </p>

            <h2>3. Intellectual Property &amp; Content Restrictions</h2>
            <p>
              All course content, training materials, modules, quizzes, images, text, graphics, logos, and
              other materials available on the Platform (&ldquo;Content&rdquo;) are the intellectual property of {branding.fullName} and
              their respective creators and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <h3>You may NOT:</h3>
            <ul>
              <li>Copy, reproduce, duplicate, or redistribute any Content from the Platform in any form</li>
              <li>Download, record, screenshot, or capture Content for offline distribution or sharing</li>
              <li>Modify, adapt, translate, or create derivative works based on the Content</li>
              <li>Share your account credentials with others to provide unauthorized access to Content</li>
              <li>Use the Content for any commercial purpose without explicit written permission</li>
              <li>Remove, alter, or obscure any copyright, trademark, or other proprietary notices</li>
              <li>Republish Content on any other website, platform, social media, or publication</li>
              <li>Use automated tools, bots, or scrapers to extract Content from the Platform</li>
            </ul>
            <h3>You MAY:</h3>
            <ul>
              <li>Access and view Content through your personal account for your own learning purposes</li>
              <li>Take personal notes for your own reference while completing course modules</li>
              <li>Share the URL of the Platform with others who may benefit from the courses</li>
              <li>Reference concepts learned in your own advocacy and organizational work</li>
            </ul>

            <h2>4. Certificates of Completion</h2>
            <p>
              Certificates issued upon course completion are for personal and professional development purposes.
              Certificates are non-transferable and are issued solely to the account holder who completed the
              course requirements. Misrepresenting certificate status or forging certificates is strictly prohibited.
            </p>
            {isScago && (
              <>
                <h3>Mainpro+ Credit Certification</h3>
                <p>
                  Certain modules on this Platform are accredited by the College of Family Physicians of Canada (CFPC)
                  for Mainpro+ continuing education credits. To be eligible for Mainpro+ credits, you must complete
                  the full module including all lessons and assessments. Credit eligibility is determined by the CFPC
                  accreditation standards and {branding.fullName} makes no guarantee of credit acceptance by
                  any individual licensing body.
                </p>
              </>
            )}

            <h2>5. Acceptable Use</h2>
            <p>When using the Platform, you agree not to:</p>
            <ul>
              <li>Interfere with or disrupt the Platform&apos;s infrastructure or services</li>
              <li>Attempt to gain unauthorized access to any part of the Platform</li>
              <li>Upload or transmit malicious code, viruses, or harmful content</li>
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Harass, abuse, or harm other users through course reviews or any other feature</li>
              <li>Use the Platform for any purpose that is unlawful or prohibited by these Terms</li>
              <li>Impersonate another person or entity</li>
            </ul>

            <h2>6. Content Accuracy &amp; Medical Disclaimer</h2>
            <p>
              We strive to ensure that all educational content on the Platform is accurate, current, and
              evidence-based. However, course content is provided for educational purposes only and should
              not be used as a substitute for professional medical advice, diagnosis, or treatment.
            </p>
            <p>
              Healthcare professionals should always exercise their own clinical judgment and consult
              relevant guidelines when making patient care decisions. The Platform and its content creators
              are not liable for clinical outcomes resulting from the application of concepts learned through
              the courses.
            </p>
            {isScago && (
              <p>
                <strong>Important:</strong> The educational content provided by {branding.fullName} does not constitute
                medical advice. All clinical information is intended for educational purposes only. Healthcare providers
                must rely on their own professional judgment and institutional guidelines when making clinical decisions.
              </p>
            )}

            <h2>7. Availability &amp; Modifications</h2>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the Platform at any time,
              with or without notice. We may update course content periodically to reflect current best
              practices and guidelines. We are not liable for any temporary unavailability due to
              maintenance, updates, or circumstances beyond our control.
            </p>

            <h2>8. Limitation of Liability</h2>
            <p>
              The Platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To the fullest extent permitted
              by applicable law, we disclaim all warranties, express or implied, including but not limited to
              implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
            <p>
              In no event shall {branding.fullName} be liable for any indirect, incidental, special, consequential, or punitive
              damages arising out of or related to your use of the Platform, even if we have been advised of
              the possibility of such damages.
            </p>

            <h2>9. Governing Law</h2>
            {isScago ? (
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the Province of Ontario
                and the federal laws of Canada applicable therein. Any disputes arising from these Terms shall be
                resolved in the courts of Ontario, Canada.
              </p>
            ) : (
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of
                Delaware, United States, without regard to its conflict of law provisions. Any disputes arising
                from these Terms shall be resolved in the courts of Delaware.
              </p>
            )}

            <h2>10. Changes to These Terms</h2>
            <p>
              We reserve the right to update or modify these Terms at any time. Changes will be effective
              upon posting to the Platform with an updated &ldquo;Last updated&rdquo; date. Your continued use of the
              Platform after any changes constitutes acceptance of the revised Terms.
            </p>

            <h2>11. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p>
              <strong>Email:</strong>{' '}
              <a href={`mailto:${branding.contactEmail}`} className="text-[#0099CA] hover:text-[#DC2626] font-bold no-underline">
                {branding.contactEmail}
              </a>
            </p>
            {branding.contactPhone && (
              <p>
                <strong>Phone:</strong>{' '}
                <a href={`tel:${branding.contactPhone.replace(/[^+\d]/g, '')}`} className="text-[#0099CA] hover:text-[#DC2626] font-bold no-underline">
                  {branding.contactPhone}
                </a>
              </p>
            )}
            {branding.contactAddress && (
              <p>
                <strong>Address:</strong> {branding.contactAddress}
              </p>
            )}
            {isScago && (
              <p>
                <strong>Charitable Registration #:</strong> 83332 0872 RR 0001
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-[#991B1B] to-[#DC2626] rounded-lg flex items-center justify-center text-white">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-lg font-black tracking-tighter">
              <span className="text-slate-900">{isScago ? 'SCAGO' : 'E-Learning'}</span>{' '}
              <span className="text-[#0099CA] font-light">{isScago ? 'Education' : 'Platform'}</span>
            </span>
          </div>
          <div className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">
            {branding.copyright}
          </div>
        </div>
      </footer>
    </div>
  );
}
