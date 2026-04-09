'use client';

import Link from 'next/link';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { PublicNav } from '@/components/public-nav';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicNav transparentInitially={false} />

      <main className="flex-1 pt-32 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#DC2626] transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-sm text-slate-400 font-bold mb-12">Last updated: April 8, 2026</p>

          <div className="prose prose-slate prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-slate-900 [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-800 [&_p]:text-slate-600 [&_p]:leading-relaxed [&_li]:text-slate-600 [&_ul]:space-y-2">

            <h2>1. Introduction</h2>
            <p>
              This Privacy Policy describes how our e-learning platform (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses,
              and protects your personal information when you use our services. We are committed to safeguarding your
              privacy and ensuring the security of your data.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
              <li>Your full name</li>
              <li>Email address</li>
              <li>Password (stored in encrypted form &mdash; we never store or have access to your plaintext password)</li>
              <li>Organization affiliation (if provided)</li>
            </ul>

            <h3>Learning Activity Data</h3>
            <p>As you use the Platform, we automatically collect:</p>
            <ul>
              <li>Course enrollment records</li>
              <li>Lesson completion progress</li>
              <li>Quiz responses and scores</li>
              <li>Certificates earned</li>
              <li>Course reviews and ratings you submit</li>
            </ul>

            <h3>Technical Data</h3>
            <p>
              We collect minimal technical data necessary to operate the Platform, including browser type,
              device information, and session cookies required for authentication. We do not use third-party
              tracking cookies or advertising pixels.
            </p>

            <h2>3. How We Use Your Information</h2>
            <p>We use your information exclusively to:</p>
            <ul>
              <li>Provide and maintain your account and access to course materials</li>
              <li>Track your learning progress and issue certificates of completion</li>
              <li>Communicate important updates about the Platform or your enrolled courses</li>
              <li>Respond to support requests you submit through our contact form</li>
              <li>Improve the quality and relevance of our educational content</li>
            </ul>
            <p>
              We do <strong>not</strong> sell, rent, or share your personal information with third parties for
              marketing purposes. We do not use your data for advertising.
            </p>

            <h2>4. Data Security</h2>
            <p>
              We take the security of your data seriously and implement industry-standard measures to protect it:
            </p>
            <ul>
              <li><strong>Encryption in transit:</strong> All data transmitted between your browser and our servers is encrypted using TLS (HTTPS)</li>
              <li><strong>Encryption at rest:</strong> Your account credentials are hashed and encrypted using modern cryptographic algorithms. We never store plaintext passwords.</li>
              <li><strong>Row-Level Security:</strong> Our database enforces granular access controls ensuring that users can only access their own data, progress records, and certificates</li>
              <li><strong>Secure authentication:</strong> We use Supabase Authentication with secure session management, token-based access, and automatic session expiration</li>
              <li><strong>Minimal data collection:</strong> We only collect information that is necessary for the operation of the Platform</li>
            </ul>

            <h2>5. Data Retention</h2>
            <p>
              We retain your account data and learning progress for as long as your account is active. If you
              wish to delete your account and all associated data, you may contact us at the email address
              provided below. Upon account deletion, your personal information will be permanently removed
              from our systems within 30 days.
            </p>
            <p>
              Anonymized, aggregate data (such as total course completion rates) may be retained indefinitely
              for the purpose of improving our educational programs.
            </p>

            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access</strong> the personal data we hold about you</li>
              <li><strong>Correct</strong> any inaccurate information in your profile</li>
              <li><strong>Delete</strong> your account and all associated personal data</li>
              <li><strong>Export</strong> your learning progress and certificate records</li>
              <li><strong>Withdraw consent</strong> for optional communications at any time</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us using the information in the Contact section below.
            </p>

            <h2>7. Cookies</h2>
            <p>
              We use only essential cookies required for authentication and session management. These cookies
              are strictly necessary for the Platform to function and cannot be disabled. We do not use
              analytics cookies, advertising cookies, or any third-party tracking technologies.
            </p>

            <h2>8. Children&apos;s Privacy</h2>
            <p>
              Our Platform is not directed at children under the age of 16. We do not knowingly collect
              personal information from children. If we become aware that we have collected data from a
              child under 16, we will take steps to delete that information promptly.
            </p>

            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make changes, we will update the
              &ldquo;Last updated&rdquo; date at the top of this page. We encourage you to review this policy
              periodically. Continued use of the Platform after changes constitutes acceptance of the updated policy.
            </p>

            <h2>10. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices,
              please contact us at:
            </p>
            <p>
              <strong>Email:</strong>{' '}
              <a href="mailto:tech@sicklecellanemia.ca" className="text-[#0099CA] hover:text-[#DC2626] font-bold no-underline">
                tech@sicklecellanemia.ca
              </a>
            </p>
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
              <span className="text-slate-900">E-Learning</span> <span className="text-[#0099CA] font-light">Platform</span>
            </span>
          </div>
          <div className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">
            &copy; 2026 All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
