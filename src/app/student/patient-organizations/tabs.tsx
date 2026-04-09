'use client';

import { useState } from 'react';
import { BookOpen, Target, Users, Globe, Laptop, GraduationCap } from 'lucide-react';

const TABS = [
  { id: 'about', label: 'About the Training Program', icon: BookOpen },
  { id: 'goal', label: 'The Goal of the Program', icon: Target },
  { id: 'audience', label: 'Target Audience', icon: Users },
  { id: 'accessibility', label: 'Program Accessibility', icon: Globe },
  { id: 'access', label: 'How to Access Course Material', icon: Laptop },
] as const;

type TabId = (typeof TABS)[number]['id'];

const TAB_CONTENT: Record<TabId, React.ReactNode> = {
  about: (
    <div className="space-y-4">
      <p className="text-slate-700 leading-relaxed">
        The Patient Organizations&apos; Training Program offers an 8-module e-course with each module designed
        to equip patient advocacy organizations with the essential skills and knowledge needed to drive
        impactful change at local, national, and global levels.
      </p>
      <p className="text-slate-700 leading-relaxed">
        Whether you are starting a new organization or looking to strengthen an existing one, this program
        provides a robust educational foundation to enhance advocacy efforts and organizational effectiveness.
      </p>
      <p className="text-slate-700 leading-relaxed">
        Each module has been carefully crafted by expert volunteers to ensure the content is accessible,
        relevant, and actionable for all learners regardless of their experience level.
      </p>
    </div>
  ),
  goal: (
    <div className="space-y-4">
      <p className="text-slate-700 leading-relaxed">
        The goal of the e-course program is to increase patient advocacy organizations&apos; capacity!
      </p>
      <p className="text-slate-700 leading-relaxed">
        By providing comprehensive training and tools, the program aims to elevate advocacy initiatives
        and organizational practices. Participants will gain practical knowledge that can be immediately
        applied to strengthen their organizations and better serve their communities.
      </p>
    </div>
  ),
  audience: (
    <div className="space-y-4">
      <p className="text-slate-700 leading-relaxed">
        This training program is designed for members of patient organizations (not limited to those
        serving the inherited blood disorders community) who are seeking to increase their effectiveness.
      </p>
      <p className="text-slate-700 leading-relaxed">
        Whether you are new to patient advocacy or looking to refine your existing skills, this program
        offers valuable insights and practical strategies to help you make a greater impact.
      </p>
    </div>
  ),
  accessibility: (
    <div className="space-y-4">
      <p className="text-slate-700 leading-relaxed">
        GANSID provided electronic devices to 25 patient organizations across low-resource countries
        to ensure that all participants have equal access to the training materials.
      </p>
      <p className="text-slate-700 leading-relaxed">
        The e-course modules are designed to be accessible on a variety of devices including
        smartphones, tablets, and computers, ensuring that learners can access the content
        whenever and wherever they need it.
      </p>
    </div>
  ),
  access: (
    <div className="space-y-4">
      <p className="text-slate-700 leading-relaxed mb-4">
        Follow these simple steps to begin your learning journey:
      </p>
      <ol className="space-y-4">
        <li className="flex gap-4">
          <span className="shrink-0 w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-sm font-bold">1</span>
          <div>
            <p className="font-semibold text-slate-800">Browse the course modules</p>
            <p className="text-slate-600 text-sm mt-0.5">Explore the available modules listed below and choose where to start.</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="shrink-0 w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-sm font-bold">2</span>
          <div>
            <p className="font-semibold text-slate-800">Enroll in a course</p>
            <p className="text-slate-600 text-sm mt-0.5">Click on any module to start. You will be automatically enrolled when you begin.</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="shrink-0 w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-sm font-bold">3</span>
          <div>
            <p className="font-semibold text-slate-800">Complete each module</p>
            <p className="text-slate-600 text-sm mt-0.5">Work through the lessons at your own pace. Your progress is saved automatically.</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="shrink-0 w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-sm font-bold">4</span>
          <div>
            <p className="font-semibold text-slate-800">Earn your certificate</p>
            <p className="text-slate-600 text-sm mt-0.5">Upon completing all lessons in a module, you will receive a certificate of completion.</p>
          </div>
        </li>
      </ol>
    </div>
  ),
};

export function PatientOrgTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('about');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab buttons */}
        <div className="border-b border-slate-200 overflow-x-auto">
          <div className="flex min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-5 py-4 text-sm font-semibold transition-colors whitespace-nowrap
                    ${isActive
                      ? 'text-[#1E3A5F]'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E3A5F]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6 lg:p-8">
          {TAB_CONTENT[activeTab]}
        </div>
      </div>
    </div>
  );
}
