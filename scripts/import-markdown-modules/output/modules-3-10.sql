-- ============================================================
-- GANSID LMS — Modules 3–10 seed
-- Generated: 2026-03-31T05:17:18.459Z
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- Module 3: Volunteer Management
-- ──────────────────────────────────────────────────────────

INSERT INTO courses (id, title, slug, description, institution_id, status, thumbnail_url, is_published, category_id)
VALUES (
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  'Volunteer Management',
  'volunteer-management',
  'Module 3 of the GANSID Capacity Building Curriculum.',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'published',
  NULL,
  true,
  NULL
);

INSERT INTO modules (id, course_id, institution_id, title, description, order_index, is_published)
VALUES (
  '51f798f4-60b2-49ae-9cdf-5b04f4916a25',
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'Volunteer Management',
  'Module 3: Volunteer Management',
  0,
  true
);

-- Lesson 0: Introduction
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '0c43d7b6-0736-4ec3-9bf6-9755c2102925',
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  '51f798f4-60b2-49ae-9cdf-5b04f4916a25',
  'Introduction',
  0,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '034db697-ac13-4470-ac8d-e58276f9ce62',
  '0c43d7b6-0736-4ec3-9bf6-9755c2102925',
  'content',
  'Introduction',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '0a767793-ee94-46c4-8964-08b3e21b0d24',
  '0c43d7b6-0736-4ec3-9bf6-9755c2102925',
  '034db697-ac13-4470-ac8d-e58276f9ce62',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Introduction to the Volunteer Management</strong></p><p>In this module, learners will gain insights on how to build a strong team of volunteers through learning the principles of recruitment, training, and retention.</p><p><em>Author: Delaney Hines, MPH, MBA | Image credits: Canva</em></p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 1: Disclaimer
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'ef1f0096-9fef-45e6-8126-841958dd3ec3',
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  '51f798f4-60b2-49ae-9cdf-5b04f4916a25',
  'Disclaimer',
  1,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'df1bf916-ac20-43d3-9e18-b1464e66e7d4',
  'ef1f0096-9fef-45e6-8126-841958dd3ec3',
  'content',
  'Disclaimer',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1d3625ea-d585-40e2-83f5-6d1471f6539e',
  'ef1f0096-9fef-45e6-8126-841958dd3ec3',
  'df1bf916-ac20-43d3-9e18-b1464e66e7d4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Disclaimer</strong></p><p>The Capacity Building Curriculum (\\"Curriculum\\") may be used strictly for educational, non-commercial purposes. By permitting such use The Global Action Network for Sickle Cell & Other Inherited Blood Disorders (GANSID) does not grant any broader license or waive any of its or any contributor''s rights under copyright or otherwise at law.</p><p>This Curriculum has been developed as an educational tool for patient organizations and advocates. The GANSID assumes no liability for any inaccurate or incomplete information contained in this Curriculum, nor any actions taken in reliance thereon. You assume full responsibility for the use of any information provided.</p><p>The information contained herein has been supplied by individual subject matter contributors without verification by us. The information is provided \\"AS IS\\" and GANSID assumes no obligation to update the information or advise on further developments concerning the topics mentioned. GANSID will not be responsible or liable in any way for the accuracy or reliability of any information provided.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 2: Learning Objectives
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '2926d108-d0a7-4a0b-a204-b44256f1ea70',
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  '51f798f4-60b2-49ae-9cdf-5b04f4916a25',
  'Learning Objectives',
  2,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'f3a1dfe9-e245-4ae1-aede-89810305f8d6',
  '2926d108-d0a7-4a0b-a204-b44256f1ea70',
  'content',
  'Learning Objectives',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '7933b462-9bd6-4573-89fe-d4e7ae180d1f',
  '2926d108-d0a7-4a0b-a204-b44256f1ea70',
  'f3a1dfe9-e245-4ae1-aede-89810305f8d6',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>By the end of this module, learners will be able to:</p><ul><li>Understand what is effective volunteer management</li><li>Explain and identify the functions and tasks associated with components of the recruitment process</li><li>Understand orientation & training and the importance of each as an ongoing process that supports and compels volunteers to remain committed and better able to deliver on their tasks</li><li>Recognize the difference between formal and informal recognition activities and understand how to recognize volunteers successfully</li></ul>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 3: Context Fundamental to Volunteer Engagement Modules
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'ed8dadad-01a5-4c59-83c5-cb1a30a7dfcf',
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  '51f798f4-60b2-49ae-9cdf-5b04f4916a25',
  'Context Fundamental to Volunteer Engagement Modules',
  3,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'c0781c67-aced-4113-b48f-89bf4ecb7c6c',
  'ed8dadad-01a5-4c59-83c5-cb1a30a7dfcf',
  'content',
  'Context Fundamental to Volunteer Engagement Modules',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '4ce081ad-0290-4a9b-980c-b625e46ada60',
  'ed8dadad-01a5-4c59-83c5-cb1a30a7dfcf',
  'c0781c67-aced-4113-b48f-89bf4ecb7c6c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>The Volunteer Engagement Module</strong></p><p>This module is intended to provide direction on managing volunteer experience by providing insight into the four stages of engagement with volunteers: Recruitment, Orientation & Training, Recognition, and Stewardship.</p><p>Volunteers serve as the bedrock for many non-profit and charitable organizations. It is imperative that, as a volunteer manager, you help, coach, and provide support to your volunteers at all stages of their relationship with you and the group. Volunteer engagement and support should be everyone''s role, but with the volunteer engagement role comes the added accountability of ensuring the following best practices are adhered to.</p><p>As you deepen your understanding of the wishes and desires of the volunteers supporting GANSID, be sure to modify and/or change your approaches in order to meet and exceed the expectations of your volunteers.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 4: Guiding Principles — What is Volunteer Engagement
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'e3dcfae8-090b-4331-ae44-ed6c2a82b94c',
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  '51f798f4-60b2-49ae-9cdf-5b04f4916a25',
  'Guiding Principles — What is Volunteer Engagement',
  4,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '58db8d82-bfac-4911-b127-29bda71a6411',
  'e3dcfae8-090b-4331-ae44-ed6c2a82b94c',
  'content',
  'Guiding Principles — What is Volunteer Engagement',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '85d20657-7efa-4e6f-9e96-630b82a7200f',
  'e3dcfae8-090b-4331-ae44-ed6c2a82b94c',
  '58db8d82-bfac-4911-b127-29bda71a6411',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>What is Volunteer Engagement?</strong></p><p>Volunteer engagement, also known as volunteer management, refers to the systematic and logical process of working with and through volunteers to achieve an organization''s objectives. Volunteer engagement can be grouped into four stages: Recruitment, Orientation & Training, Recognition, and Stewardship.</p><p>Volunteer engagement typically involves motivating volunteers, leading and supervising volunteers in the various defined roles your organization has established. These roles can include community ambassadors, program support, information holders, liaisons, etc.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '2b57005d-3f14-409e-958d-d85433c016de',
  'e3dcfae8-090b-4331-ae44-ed6c2a82b94c',
  '58db8d82-bfac-4911-b127-29bda71a6411',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Role of the Volunteer Manager (4 Key Responsibilities):</strong></p><ol><li>Get to know your volunteers so that you can provide them with a rewarding experience.</li><li>Ensure the skills, interests and experiences of the volunteers are appropriately matched to the needs of the organization.</li><li>Ensure volunteers are well-trained, matched to roles that are meaningful to them and appropriately recognized.</li></ol>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1bb5269a-068e-4d84-9350-a922d6022ad3',
  'e3dcfae8-090b-4331-ae44-ed6c2a82b94c',
  '58db8d82-bfac-4911-b127-29bda71a6411',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What else is volunteer engagement referred to as:","options":["Volunteer management","Volunteer coordination","Volunteer administration","Volunteer sleuthing"],"correct_answer":"Volunteer management","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

-- Lesson 5: Recruitment
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '99cc1b5a-3360-4d1f-8e2f-882b9b2399ba',
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  '51f798f4-60b2-49ae-9cdf-5b04f4916a25',
  'Recruitment',
  5,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '6519ea58-8625-478d-876c-801d8232304f',
  '99cc1b5a-3360-4d1f-8e2f-882b9b2399ba',
  'content',
  'Recruitment',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '729cec01-31e7-4ab1-af8b-4895228e5283',
  '99cc1b5a-3360-4d1f-8e2f-882b9b2399ba',
  '6519ea58-8625-478d-876c-801d8232304f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Recruitment</strong></p><p>In this section you will be able to:</p><ul><li>Explain and identify the key steps and tasks associated with the recruitment phase.</li><li>Understand how to ask volunteers about their goals, interests and skills and explore ways to match them to roles.</li></ul><p>Recruitment can be broken down into four key activities:</p><ol><li><strong>Plan:</strong> Identify your needs</li><li><strong>Sourcing:</strong> Identify places you would like to recruit from</li><li><strong>Applying:</strong> Define the application process volunteers need to complete in order to join</li><li><strong>Selecting and Appointing:</strong> Find the right fit for them and your organization</li></ol>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '47f8616c-63a7-4688-942d-2779a74d3a56',
  '99cc1b5a-3360-4d1f-8e2f-882b9b2399ba',
  '6519ea58-8625-478d-876c-801d8232304f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Plan: Identify Your Needs</strong></p><p>As part of your volunteer objectives and goals, take some time to define the roles and responsibilities volunteers could fill to help shore up the gaps within your organization.</p><p><strong>Planning: Risk Assessment</strong></p><p>Be sure to identify any risks that may come along with onboarding external parties into your organization. The comfort, safety, and well-being of employees is of utmost importance.</p><p><strong>Planning: Role Description</strong></p><p>Clear, defined expectations and descriptions of the skills required to satisfy the role are critical. The more discrete the roles can be made with explicit details about what the role is responsible for, the better.</p><p>Be flexible! The more planned and clear you are about your needs, the easier it will be for you to adjust and/or change roles to meet them.</p>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'cc7e4ba1-6131-498d-a8a8-9123b3ceaefe',
  '99cc1b5a-3360-4d1f-8e2f-882b9b2399ba',
  '6519ea58-8625-478d-876c-801d8232304f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Sourcing: Identify Where You Would Like to Recruit From</strong></p><p>Three key methods for sourcing volunteers:</p><ol><li><strong>Broad based</strong> — Wide outreach to general public</li><li><strong>Targeted</strong> — Focused outreach to specific communities or groups</li><li><strong>Peer-to-Peer</strong> — Leveraging existing volunteers to recruit others</li></ol>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a5a2620a-7823-4e36-89fe-f34bbedaa99f',
  '99cc1b5a-3360-4d1f-8e2f-882b9b2399ba',
  '6519ea58-8625-478d-876c-801d8232304f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Applying: Define the Application Process</strong></p><ul><li>Applying requires some form of an intake process.</li><li>Make it easy for your volunteers to join your team.</li><li>Ensure you have a clear and step-by-step general intake form. This form should be straightforward so that volunteers of any skill level can express their interest in securing a volunteer role.</li></ul>","mode":"scrolling"}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '52f0469f-8a9e-4407-8058-164e1de92c4d',
  '99cc1b5a-3360-4d1f-8e2f-882b9b2399ba',
  '6519ea58-8625-478d-876c-801d8232304f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Selecting and Appointing: Find the Right Fit</strong></p><p><strong>Before (Screening):</strong> Selection requires an unbiased assessment of the volunteer candidate''s skills and experiences to ensure the role is the best fit for them.</p><p><strong>After (Appointing):</strong> Once you have completed the screening steps associated with the application, determine whether the prospective volunteer is a good fit for the role. Be sure to inform the successful applicant of your decision.</p>","mode":"scrolling"}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd507f9a6-d591-4cd7-98a9-688bcb4c5b12',
  '99cc1b5a-3360-4d1f-8e2f-882b9b2399ba',
  '6519ea58-8625-478d-876c-801d8232304f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Finally, welcome your new volunteer(s) to the team!</strong></p><p><strong>► Redirection</strong></p><p>In the event a volunteer doesn''t fit the role description or the organization, feel free to redirect them to another role better suited to them or a partner organization.</p>","mode":"scrolling"}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '2316fc09-a75f-40ae-b817-02dfb0b51dce',
  '99cc1b5a-3360-4d1f-8e2f-882b9b2399ba',
  '6519ea58-8625-478d-876c-801d8232304f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which of the following is NOT one of the four key activities in the recruitment phase?","options":["Training volunteers","Identifying your needs","Sourcing volunteers","Defining the application process"],"correct_answer":"Training volunteers","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '16e90f10-a09a-47eb-ba5f-3e126dcec0aa',
  '99cc1b5a-3360-4d1f-8e2f-882b9b2399ba',
  '6519ea58-8625-478d-876c-801d8232304f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What should you do if a volunteer does not fit the role description or the organization?","options":["Inform them they are not accepted and end the process","Redirect them to another role better suited to them or a partner organization","Ask them to reapply later","Provide them with additional training to fit the role"],"correct_answer":"Redirect them to another role better suited to them or a partner organization","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  7,
  true,
  '{}',
  1
);

-- Lesson 6: Orientation and Training
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '34ecb61b-6f13-40b4-9346-950c75b7f7af',
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  '51f798f4-60b2-49ae-9cdf-5b04f4916a25',
  'Orientation and Training',
  6,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'e56649b2-9c52-4008-8e62-a04b9879e940',
  '34ecb61b-6f13-40b4-9346-950c75b7f7af',
  'content',
  'Orientation and Training',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'ca7d25bb-a6f0-47d1-990c-8fe3521e4fc0',
  '34ecb61b-6f13-40b4-9346-950c75b7f7af',
  'e56649b2-9c52-4008-8e62-a04b9879e940',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Orientation and Training</strong></p><p>In this section you will be able to:</p><ul><li>Explain the importance of Orientation & Training and view it as ongoing processes that support the volunteers'' success.</li><li>Ask volunteers about their goals, interests and skills and explore ways to match them to roles.</li><li>Develop training & orientation practices that equip volunteers with the knowledge and information they need.</li></ul><p>Orientation is the process of supporting volunteers to understand the organization, its vision and goals and the relationship they have with the organization. There are three types of orientation: Social, System and Position.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e7707896-cffd-456d-9fcc-907314789dfc',
  '34ecb61b-6f13-40b4-9346-950c75b7f7af',
  'e56649b2-9c52-4008-8e62-a04b9879e940',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Types of Orientation</strong></p><ul><li><strong>Social</strong> — Orient the volunteer to the work environment (i.e., dress code, hours of operation, housekeeping)</li><li><strong>System</strong> — Help the volunteer understand how their role fits into the larger context of the organization</li><li><strong>Position</strong> — Review the role description, answer questions, reinforce importance of asking for help when needed</li></ul>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '9d611245-54b7-4837-90dd-a955fb6ae1cd',
  '34ecb61b-6f13-40b4-9346-950c75b7f7af',
  'e56649b2-9c52-4008-8e62-a04b9879e940',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which of the following best describes the purpose of orientation for volunteers?","options":["To support volunteers in understanding the organization, its vision, and their relationship with it","To evaluate the volunteer''s performance","To conduct a background check on the volunteer","To assign specific tasks to the volunteer"],"correct_answer":"To support volunteers in understanding the organization, its vision, and their relationship with it","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '513c14c8-6cc5-4c2a-b5e0-1d3bea5e698a',
  '34ecb61b-6f13-40b4-9346-950c75b7f7af',
  'e56649b2-9c52-4008-8e62-a04b9879e940',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is an effective way to provide orientation to new volunteers?","options":["Assign a mentor or partner, such as a senior volunteer or a leader","Have them start working immediately without any introduction","Give them a volunteer handbook and leave them to read it on their own","Conduct a formal training session once a year"],"correct_answer":"Assign a mentor or partner, such as a senior volunteer or a leader","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '21324526-f049-4fea-b74e-5fe36ea0ce12',
  '34ecb61b-6f13-40b4-9346-950c75b7f7af',
  'e56649b2-9c52-4008-8e62-a04b9879e940',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the importance of asking volunteers about their goals, interests, and skills during the orientation and training process?","options":["To ensure they understand the organization''s rules","To match them to roles that align with their preferences and strengths","To keep a record of their personal information","To establish their availability for shifts"],"correct_answer":"To match them to roles that align with their preferences and strengths","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '92474c15-4c8f-4c90-a3d4-97541450d64b',
  '34ecb61b-6f13-40b4-9346-950c75b7f7af',
  'e56649b2-9c52-4008-8e62-a04b9879e940',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which type of orientation focuses on helping the volunteer understand how their role fits into the larger context of the organization?","options":["System","Social","Operational","Position"],"correct_answer":"System","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  5,
  true,
  '{}',
  1
);

-- Lesson 7: Recognition
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'bc9125bb-41bd-4249-b79e-30e98c54f224',
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  '51f798f4-60b2-49ae-9cdf-5b04f4916a25',
  'Recognition',
  7,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '7c9cda75-62fd-49d7-8b03-d469b316a91e',
  'bc9125bb-41bd-4249-b79e-30e98c54f224',
  'content',
  'Recognition',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '8498571b-e5d9-44b8-8284-35e02533f408',
  'bc9125bb-41bd-4249-b79e-30e98c54f224',
  '7c9cda75-62fd-49d7-8b03-d469b316a91e',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Recognition</strong></p><p>Volunteer recognition is an important way to ensure volunteers feel valued for their contributions and proud to be part of the organization. It''s a great way to demonstrate to volunteers the impact they are having or have had. Recognition is not the sole responsibility of a volunteer manager; it involves everyone in the organization and should be proactive rather than reactive.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '13f5e558-d9f7-4caf-94a5-d81587478831',
  'bc9125bb-41bd-4249-b79e-30e98c54f224',
  '7c9cda75-62fd-49d7-8b03-d469b316a91e',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Formal and Informal Volunteer Recognition</strong></p><p><strong>Formal Recognition</strong></p><p>Formal recognition events and activities should align with both the reasons a volunteer chooses to give their time as well as the missions of the organization. Formal recognition can be in the form of: awards, hand written cards, or formal medal ceremonies, such as distinguished volunteer award ceremonies. If you choose to hold an event, prioritize logistics (where the event will be held, who are you going to invite, what time of year you will hold the event, and why you want to host a formal event as opposed to an informal event).</p><p><strong>Informal Recognition</strong></p><p>Informal recognition is the way we conduct our relationship with volunteers every day. It does not involve formal processes and is authentic and sincere. Informal recognition exists and thrives within the organization only when a culture of recognition exists. Informal recognition can come in the form of: saying thank you at the completion of a task, including volunteers in staff celebrations, remembering anniversaries or birthdays.</p><p><strong>Best Practice:</strong> Survey your volunteers to get their thoughts and feedback on recognition activities — understand how they want to be recognized and tailor your approach accordingly.</p>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '94190965-0ee9-4890-9cc4-d30438823702',
  'bc9125bb-41bd-4249-b79e-30e98c54f224',
  '7c9cda75-62fd-49d7-8b03-d469b316a91e',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Who is responsible for recognizing volunteers within an organization?","options":["Everyone in the organization","Only the volunteer manager","Only the organization''s CEO","Only the human resources department"],"correct_answer":"Everyone in the organization","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'aa10b2ec-f4aa-497a-b95a-f42ca42ff552',
  'bc9125bb-41bd-4249-b79e-30e98c54f224',
  '7c9cda75-62fd-49d7-8b03-d469b316a91e',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Which of the following are examples of formal and informal volunteer recognition?</strong></p>","mode":"scrolling"}'::jsonb,
  3,
  true,
  '{}',
  1
);

-- Lesson 8: Stewardship
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '5deefeb7-2a07-483e-b800-3e0c4eaea628',
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  '51f798f4-60b2-49ae-9cdf-5b04f4916a25',
  'Stewardship',
  8,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '863052e3-b718-4e2f-a315-9eeb462bee0a',
  '5deefeb7-2a07-483e-b800-3e0c4eaea628',
  'content',
  'Stewardship',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '3dc3e5ef-01ec-471a-b306-2004c72e6358',
  '5deefeb7-2a07-483e-b800-3e0c4eaea628',
  '863052e3-b718-4e2f-a315-9eeb462bee0a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Stewardship</strong></p><p>In this section you will be better able to:</p><ul><li>Explain the importance of stewardship and the vital role it plays in the development and strengthening of relationships with volunteers.</li><li>Engage and enhance the relationship between volunteers and your organization.</li><li>Thoughtfully and strategically weave stewardship throughout the volunteers'' entire experience at the organization.</li></ul><p>Stewardship encompasses all the ways volunteer engagement shows they have the volunteers'' best interests at heart throughout the entire process. It''s an ongoing effort.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'abe0d0f0-eb41-43f2-98bb-9bc29f5fb467',
  '5deefeb7-2a07-483e-b800-3e0c4eaea628',
  '863052e3-b718-4e2f-a315-9eeb462bee0a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Stewardship happens at all stages of volunteer management: recruitment, orientation & training, and recognition.</strong></p><p>This is important because it opens the door to further enhancements of the volunteer experience and deepens a volunteer''s connection with the organization.</p>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '600fb9d6-d94c-4e36-9738-15c54b70661e',
  '5deefeb7-2a07-483e-b800-3e0c4eaea628',
  '863052e3-b718-4e2f-a315-9eeb462bee0a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Stewardship vs. Recognition</strong></p><p>While on the surface, stewardship may seem like recognition, there are differences between the two. Stewardship is ongoing and woven into every stage of the volunteer relationship, whereas recognition is typically a specific act or event acknowledging a volunteer''s contribution.</p>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f12ee51b-c267-4991-8318-826f2626e126',
  '5deefeb7-2a07-483e-b800-3e0c4eaea628',
  '863052e3-b718-4e2f-a315-9eeb462bee0a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which of the following is an example of incorporating stewardship during the orientation & training stage?","options":["Asking volunteers how they would like to be involved","Conducting a formal medal ceremony","Checking in with volunteers to ensure they have the skills and knowledge for success","Sending out monthly newsletters"],"correct_answer":"Checking in with volunteers to ensure they have the skills and knowledge for success","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e9ab5701-b2a5-4360-8c54-bee76308c9ef',
  '5deefeb7-2a07-483e-b800-3e0c4eaea628',
  '863052e3-b718-4e2f-a315-9eeb462bee0a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"At which stages of volunteer management does stewardship occur?","options":["Recruitment, orientation & training, and recognition","Recruitment only","Orientation & training only","Recognition only"],"correct_answer":"Recruitment, orientation & training, and recognition","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1b60c610-dbac-45af-9aa0-1673810d8559',
  '5deefeb7-2a07-483e-b800-3e0c4eaea628',
  '863052e3-b718-4e2f-a315-9eeb462bee0a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can mentorship serve as a component of stewardship?","options":["By providing formal training sessions to all volunteers","By transferring knowledge and wisdom through a structured or informal relationship","By conducting performance reviews for volunteers","By organizing large-scale volunteer events"],"correct_answer":"By transferring knowledge and wisdom through a structured or informal relationship","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  5,
  true,
  '{}',
  1
);

-- Lesson 9: Evaluation
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '8915729f-4a31-4103-8c3a-bdc836b3cd0a',
  '9b228b9b-820f-4abb-92ac-d3a47091cab4',
  '51f798f4-60b2-49ae-9cdf-5b04f4916a25',
  'Evaluation',
  9,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '40927984-ea06-44b7-a56d-1bf4dcb47308',
  '8915729f-4a31-4103-8c3a-bdc836b3cd0a',
  'content',
  'Evaluation',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '3a1714a1-980a-4765-9099-27f4daffa026',
  '8915729f-4a31-4103-8c3a-bdc836b3cd0a',
  '40927984-ea06-44b7-a56d-1bf4dcb47308',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Evaluation</strong></p><p>In this section you will be better able to:</p><ul><li>Appropriately say goodbye to volunteers when they leave the organization.</li><li>Use an evaluation as a tool to help the volunteer program learn and grow.</li><li>Find additional resources to support these processes.</li></ul><p>When we look at the trends in volunteering, we see that many volunteers seek short-term involvement with a project or organization. They want to give their time in a brief burst of energy then move on to their next opportunity. Everything done up to this point contributes to the growth of a relationship so that even though their time as a volunteer has ended, a solid foundation has been laid. This way, when they are ready for a change, there are options to discuss with them.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '69d2fff1-4b1d-4057-bb1a-e600820307de',
  '8915729f-4a31-4103-8c3a-bdc836b3cd0a',
  '40927984-ea06-44b7-a56d-1bf4dcb47308',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Three Key Aspects of Volunteer Evaluation & Transition:</strong></p><ol><li>If a volunteer is not meeting expectations or you feel they should no longer be volunteering at your organization, it is vital that you bring this to senior leadership immediately. You and senior leadership should then determine the appropriate next steps.</li></ol><ol><li>Effective evaluation strengthens a volunteer''s experience by providing the opportunity to give and receive information about their experience.</li></ol><ol><li>Evaluation can be done informally or formally, depending on the role a volunteer is in. It may be different for each volunteer and take place at various times throughout the volunteers'' tenure.</li></ol>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd5b4d5b3-4b8f-4429-a7e5-2aa6717a9171',
  '8915729f-4a31-4103-8c3a-bdc836b3cd0a',
  '40927984-ea06-44b7-a56d-1bf4dcb47308',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Types of Feedback Questions to Consider</strong></p><p><strong>► Volunteer''s Experience</strong></p><p>Ask if we proactively recognized them during their time. Inquire if they felt there were continuous check-ins and sharing of orientation or training needs.</p><p><strong>► Process</strong></p><p>Were there any gaps in their onboarding and role determinations that need attention?</p><p><strong>► General</strong></p><p>What should we start, stop, and continue doing? How likely are you to return as a volunteer?</p>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '9c99099b-5aad-4884-93bf-1463d9d6564f',
  '8915729f-4a31-4103-8c3a-bdc836b3cd0a',
  '40927984-ea06-44b7-a56d-1bf4dcb47308',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What should be done if a volunteer is not meeting expectations or needs to leave the organization?","options":["Immediately terminate their involvement without discussion","Ignore the issue and hope it resolves itself","Bring the matter to senior leadership to discuss appropriate next steps","Reduce their responsibilities without informing them"],"correct_answer":"Bring the matter to senior leadership to discuss appropriate next steps","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '45203c7f-fcda-4da3-a4fa-8d62b2daf361',
  '8915729f-4a31-4103-8c3a-bdc836b3cd0a',
  '40927984-ea06-44b7-a56d-1bf4dcb47308',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is a key trend in volunteering that organizations should be aware of?","options":["Volunteers are increasingly seeking short-term involvement","Volunteers prefer long-term, indefinite commitments","Volunteers are less interested in organizational goals","Volunteers are seeking more formalized roles"],"correct_answer":"Volunteers are increasingly seeking short-term involvement","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e09bb81d-596b-401a-b71f-ac0de101a55e',
  '8915729f-4a31-4103-8c3a-bdc836b3cd0a',
  '40927984-ea06-44b7-a56d-1bf4dcb47308',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"When should an evaluation of a volunteer take place?","options":["At various times throughout their tenure, depending on their role","Only at the end of their volunteer tenure","Once a year, during the annual performance review","Only if there are issues with their performance"],"correct_answer":"At various times throughout their tenure, depending on their role","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '0637e586-d4ca-4d8c-b875-1c288bd4f824',
  '8915729f-4a31-4103-8c3a-bdc836b3cd0a',
  '40927984-ea06-44b7-a56d-1bf4dcb47308',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is it important to have an evaluation process for volunteers?","options":["To collect fees for their participation","To provide opportunities to give and receive information about their experience","To lengthen their volunteering period","To compare volunteers against each other"],"correct_answer":"To provide opportunities to give and receive information about their experience","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  6,
  true,
  '{}',
  1
);

-- ──────────────────────────────────────────────────────────
-- Module 4: Leadership
-- ──────────────────────────────────────────────────────────

INSERT INTO courses (id, title, slug, description, institution_id, status, thumbnail_url, is_published, category_id)
VALUES (
  '27692b1f-819f-4cfc-b2a0-2ae516c378e5',
  'Leadership',
  'leadership',
  'Module 4 of the GANSID Capacity Building Curriculum.',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'published',
  NULL,
  true,
  NULL
);

INSERT INTO modules (id, course_id, institution_id, title, description, order_index, is_published)
VALUES (
  '27cd3e27-0f28-4126-826f-e401dec2080b',
  '27692b1f-819f-4cfc-b2a0-2ae516c378e5',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'Leadership',
  'Module 4: Leadership',
  0,
  true
);

-- Lesson 0: Introduction
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '22921de2-a793-4219-be56-5d240ecb5d64',
  '27692b1f-819f-4cfc-b2a0-2ae516c378e5',
  '27cd3e27-0f28-4126-826f-e401dec2080b',
  'Introduction',
  0,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '1a066c1d-b175-421c-977f-93caed7cc2a0',
  '22921de2-a793-4219-be56-5d240ecb5d64',
  'content',
  'Introduction',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'b3a529f1-15b5-4ff8-84eb-cc607d54bc77',
  '22921de2-a793-4219-be56-5d240ecb5d64',
  '1a066c1d-b175-421c-977f-93caed7cc2a0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>In this module, learners will hone their understanding of what constitutes effective leadership in a patient advocacy organization.</strong></p><p><em>Author: Annette Akinsete MBBS, DTM&H, MPH, FMCPH | Image credits: Canva, www.freepik.com</em></p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 1: Disclaimer
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'd1d19ba6-77b1-4852-b351-b30568a842cb',
  '27692b1f-819f-4cfc-b2a0-2ae516c378e5',
  '27cd3e27-0f28-4126-826f-e401dec2080b',
  'Disclaimer',
  1,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '5cde863a-a27b-4fa3-b4ba-cdebc2aa7085',
  'd1d19ba6-77b1-4852-b351-b30568a842cb',
  'content',
  'Disclaimer',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '60e7c32b-ea91-4e03-95c8-2b7fb1081c60',
  'd1d19ba6-77b1-4852-b351-b30568a842cb',
  '5cde863a-a27b-4fa3-b4ba-cdebc2aa7085',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>The Capacity Building Curriculum (\\"Curriculum\\") may be used strictly for educational, non-commercial purposes. By permitting such use, The Global Action Network for Sickle Cell & Other Inherited Blood Disorders (GANSID) does not grant any broader license or waive any of its or any contributor''s rights under copyright or otherwise at law.</p><p>This Curriculum has been developed as an educational tool for patient organizations and advocates. The GANSID assumes no liability for any inaccurate or incomplete information contained in this Curriculum, nor any actions taken in reliance thereon. You assume full responsibility for the use of any information provided.</p><p>The information contained herein has been supplied by individual subject matter contributors without verification by us. The information is provided \\"AS IS\\" and GANSID assumes no obligation to update the information or advise on further developments concerning the topics mentioned.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 2: Learning Objectives
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '7e4da056-80f4-4d41-a1af-0edf66e3399d',
  '27692b1f-819f-4cfc-b2a0-2ae516c378e5',
  '27cd3e27-0f28-4126-826f-e401dec2080b',
  'Learning Objectives',
  2,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '67c7e206-18f1-43a3-8340-c3eee390aba0',
  '7e4da056-80f4-4d41-a1af-0edf66e3399d',
  'content',
  'Learning Objectives',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '78c8bec9-08a0-407f-b134-2e871d6a3156',
  '7e4da056-80f4-4d41-a1af-0edf66e3399d',
  '67c7e206-18f1-43a3-8340-c3eee390aba0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>Following completion of this module, patient organizations will be able to:</p><ul><li>Develop appropriate Leadership Skills</li><li>Adapt Leadership Styles</li><li>Know the Do''s of Effective Leadership</li><li>Know the Don''ts of Effective Leadership</li><li>Promote Ethical Leadership</li><li>Enhance Stakeholder Engagement</li><li>Lead for Strategic Planning and Management</li><li>Lead for Resource Mobilization and Financial Management</li><li>Lead for Advocacy and Social Change</li><li>Understand Leadership Development and Succession Planning</li></ul>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 3: Context to the Leadership Module
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '1a69f221-f952-4188-bcba-72fefd724d3c',
  '27692b1f-819f-4cfc-b2a0-2ae516c378e5',
  '27cd3e27-0f28-4126-826f-e401dec2080b',
  'Context to the Leadership Module',
  3,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '8b9049ce-ecbf-449c-98a2-9d0a8d5418b1',
  '1a69f221-f952-4188-bcba-72fefd724d3c',
  'content',
  'Context to the Leadership Module',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'b175e0e9-effb-4c94-813f-23892f5fac9d',
  '1a69f221-f952-4188-bcba-72fefd724d3c',
  '8b9049ce-ecbf-449c-98a2-9d0a8d5418b1',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Context to the Leadership Module</strong></p><p>Leadership training, particularly for NGOs/non-profits, aims to equip individuals within these organizations with the knowledge, skills, and mindset necessary to effectively lead and manage in the unique context of the non-profit sector.</p><p>GANSID leadership training will contribute to building stronger, more resilient, and more impactful non-profit organizations that are better equipped to address the complex challenges facing communities around the world.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 4: Understanding Leadership
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'b909d501-ebc9-4814-8b8b-5dc579d1ea35',
  '27692b1f-819f-4cfc-b2a0-2ae516c378e5',
  '27cd3e27-0f28-4126-826f-e401dec2080b',
  'Understanding Leadership',
  4,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '57ff9d2f-7798-4a6e-9de2-519f945ae15f',
  'b909d501-ebc9-4814-8b8b-5dc579d1ea35',
  'content',
  'Understanding Leadership',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '9be804c0-13d9-4e01-ad63-47dafdcdae22',
  'b909d501-ebc9-4814-8b8b-5dc579d1ea35',
  '57ff9d2f-7798-4a6e-9de2-519f945ae15f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Understanding Leadership</strong></p><p>Topics covered in this lesson:</p><ul><li>Definition of leadership</li><li>Importance of effective leadership</li></ul>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a15bab79-2f78-4e59-a2f9-c6586be0058a',
  'b909d501-ebc9-4814-8b8b-5dc579d1ea35',
  '57ff9d2f-7798-4a6e-9de2-519f945ae15f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Definition of Leadership</strong></p><p><strong>LEADERSHIP</strong> is the process of guiding and influencing others or a team towards a common vision or goal. It entails inspiring and motivating one''s team, encouraging collaboration, and making decisions.</p>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '352f357b-54f0-4887-aeef-3e7a3a1a6fde',
  'b909d501-ebc9-4814-8b8b-5dc579d1ea35',
  '57ff9d2f-7798-4a6e-9de2-519f945ae15f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Importance of Effective Leadership</strong></p><p>Effective leadership is crucial for the success of any organization. It is important because it:</p><ul><li>Impacts employee satisfaction, productivity, and overall organizational performance</li></ul>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '526b9770-9765-439c-9539-f7924e8e97f4',
  'b909d501-ebc9-4814-8b8b-5dc579d1ea35',
  '57ff9d2f-7798-4a6e-9de2-519f945ae15f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which of the following best describes the primary role of leadership in an organization?","options":["Ensuring that all tasks are completed on time","Guiding and influencing others towards a common vision or goal","Enforcing company policies and regulations strictly","Managing the financial aspects of the organization"],"correct_answer":"Guiding and influencing others towards a common vision or goal","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '59c2a4be-956e-4533-813f-9ed52134a720',
  'b909d501-ebc9-4814-8b8b-5dc579d1ea35',
  '57ff9d2f-7798-4a6e-9de2-519f945ae15f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is effective leadership crucial for the success of an organization?","options":["It ensures that the organization''s financial resources are managed efficiently.","It focuses solely on the production and sales targets of the organization.","It inspires and motivates the team, encourages collaboration, and impacts overall performance.","It enforces strict compliance with organizational rules and regulations."],"correct_answer":"It inspires and motivates the team, encourages collaboration, and impacts overall performance.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

-- Lesson 5: Leadership Styles
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '0a83975b-41bf-4218-bf2d-34b360212d9d',
  '27692b1f-819f-4cfc-b2a0-2ae516c378e5',
  '27cd3e27-0f28-4126-826f-e401dec2080b',
  'Leadership Styles',
  5,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '1e5f297a-5cc1-4bd8-8d78-d04fcc475e78',
  '0a83975b-41bf-4218-bf2d-34b360212d9d',
  'content',
  'Leadership Styles',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c8fc9d11-b019-46a0-b92d-581fd4b70880',
  '0a83975b-41bf-4218-bf2d-34b360212d9d',
  '1e5f297a-5cc1-4bd8-8d78-d04fcc475e78',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Leadership Styles</strong></p><p>This lesson covers:</p><ul><li>Various styles of leadership</li><li>Discussion of strengths and weaknesses of each style</li><li>Characteristics of a good and effective leader</li></ul>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '8b1a7fef-699d-466a-b789-91d1f99b6b9e',
  '0a83975b-41bf-4218-bf2d-34b360212d9d',
  '1e5f297a-5cc1-4bd8-8d78-d04fcc475e78',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>10 Leadership Styles Explained:</strong></p><p><strong>1. Coaching Leadership</strong></p><p>A coaching leader serves as a mentor and guide. They actively listen to the concerns and aspirations of their team members and provide constructive feedback and support. Moreover, they encourage individual growth and assist employees in overcoming challenges through regular coaching sessions, fostering a collaborative environment.</p><p><strong>2. Visionary Leadership</strong></p><p>A visionary leader sees the future clearly and compellingly. They effectively communicate this vision to their team, motivating them to work together to achieve common goals. They generate enthusiasm and a sense of purpose through persuasive communication, encouraging innovation and creativity. A visionary leader lays out a plan for success, setting high expectations and encouraging the team to push boundaries.</p><p><strong>3. Servant Leadership</strong></p><p>Servant leaders are service-based leaders; they prioritize their team''s needs and well-being. They create a supportive environment in which people feel valued and appreciated. They understand that a team''s success depends on the satisfaction and motivation of its members. By focusing on individual development and fostering community, servant leaders inspire their team to achieve their best.</p><p><strong>4. Autocratic Leadership</strong></p><p>An autocratic leader wields power and control over decision-making. They make unilateral decisions and expect their team members to follow them. This style can be effective when quick and decisive action is required. On the other hand, it limits employee engagement and creativity.</p><p><strong>5. Laissez-Faire Leadership</strong></p><p>A laissez-faire leader takes a more passive approach, allowing team members autonomy and freedom. They believe in their employees'' ability to make decisions and handle tasks independently. This style can foster creativity and innovation. However, if not managed properly, it can lead to a lack of direction or coordination.</p><p><strong>6. Democratic Leadership</strong></p><p>The Democratic Leader values their team members'' opinions. Employees are involved in decision-making processes, and their ideas and perspectives are sought. A democratic leader fosters collaboration, teamwork, and employee engagement by instilling a sense of ownership and participation.</p><p><strong>7. Pacesetter Leadership</strong></p><p>The pacesetter leader sets the standard by creating challenging goals and demonstrating high performance. They have a strong work ethic and expect the same level of dedication from team members. This style can drive productivity and achieve results, fostering an environment of excellence. However, it may result in high-pressure environments and potentially overlook employee development and well-being.</p><p><strong>8. Transformational Leadership</strong></p><p>Transformational leaders inspire and motivate their teams through their charismatic personalities and compelling vision. They promote personal growth, building on the strengths of team members, leading to an innovative culture. A transformational leader stimulates positive change, empowers individuals, and fosters a shared sense of purpose.</p><p><strong>9. Transactional Leadership</strong></p><p>Transactional leadership establishes clear goals and expectations, with rewards & punishments based on performance: rewards for meeting targets and penalties for failing to meet them. This style emphasizes a structured approach that motivates employees to perform better and is task-oriented.</p><p><strong>10. Bureaucratic Leadership</strong></p><p>A bureaucratic leader strictly adheres to rules, policies, and procedures. They make certain that tasks are completed systematically, emphasizing adherence to established protocols. This leadership style is frequently seen in hierarchical organizations where consistency and adherence to established guidelines are paramount.</p>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '58fd439f-447b-4a0b-9261-54fbe760c278',
  '0a83975b-41bf-4218-bf2d-34b360212d9d',
  '1e5f297a-5cc1-4bd8-8d78-d04fcc475e78',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Recap of Key Leadership Styles</strong></p><p>[Interactive recap — learners scratch to reveal summary of key styles]</p>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '82fb7987-bd9f-4a69-a7b1-38c42c5c8a50',
  '0a83975b-41bf-4218-bf2d-34b360212d9d',
  '1e5f297a-5cc1-4bd8-8d78-d04fcc475e78',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is a key characteristic of a visionary leader?","options":["They clearly communicate a compelling vision and motivate the team to achieve common goals.","They prefer to delegate tasks and avoid direct involvement.","They set challenging goals and maintain high standards.","They focus primarily on adhering to established processes and protocols."],"correct_answer":"They clearly communicate a compelling vision and motivate the team to achieve common goals.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd7ce4bed-2e74-436a-b2af-6572b6b4da46',
  '0a83975b-41bf-4218-bf2d-34b360212d9d',
  '1e5f297a-5cc1-4bd8-8d78-d04fcc475e78',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which leadership style involves team members in the decision-making process and values their input?","options":["Democratic","Pacesetter","Laissez-Faire"],"correct_answer":"Democratic","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

-- Lesson 6: Effective Leadership Practices
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  '27692b1f-819f-4cfc-b2a0-2ae516c378e5',
  '27cd3e27-0f28-4126-826f-e401dec2080b',
  'Effective Leadership Practices',
  6,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'content',
  'Effective Leadership Practices',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f90a2169-0adf-48da-b0ee-808ebd87d685',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Effective Leadership Practices</strong></p><p>Topics covered:</p><ul><li>Qualities/Characteristics of Effective Leaders</li><li>Examination of Effective Leadership behaviours (What works)</li><li>Examining Ineffective Leadership behaviours (What does not work)</li></ul>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'fe594c55-eaa7-496f-9377-bdf809bb70a3',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Examining Effective Leadership Behaviours:</strong></p><ol><li>Communication</li><li>Delegation</li><li>Listening</li><li>Providing clear direction</li><li>Showing empathy</li><li>Recognising team''s competence</li><li>Build conducive work climate</li><li>Continually learning in order to adapt to changing business environment</li><li>Gain trust of team</li><li>Encourage feedback</li></ol>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1c45c939-0bb7-4363-962d-b9a995d34378',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>[Illustrated examples of effective vs. ineffective leadership behaviours]</p>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f5bf7ff3-195e-4240-bcb4-a4bd66e727d7',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Tips! Tips!! Tips!!!</strong></p><p><strong>1. Talk Less and Listen More</strong></p><p>A good leader understands when to retreat, listens to the contributions of others and considers those ideas and suggestions when making decisions. Being able to observe a situation from different perspectives can help you overcome challenges. When your team members feel like they have a voice and you respect their opinions, it makes it easy for them to trust your leadership.</p><p><strong>2. Understand Each Position in Your Organization</strong></p><p>It is often easier to lead a team if you understand the positions and responsibilities of the employees in the organization. You can achieve this by devoting time to learning about each individual in your team, the position they occupy, and the particular tasks they''re responsible for. This shows team members that you care about them and their roles. It also equips you with the knowledge to explain and promote the company to others.</p><p><strong>3. Take Care of Your Team Members</strong></p><p>A leader is only as successful as the team they lead. An important duty of a leader is to take care of their team members and support their personal and professional goals. Show your team members that they are important to the organisation, that you respect their goals and ambitions, and that you want what is best for them. This will motivate them to perform better and remain with the organisation, reducing employee attrition.</p><p><strong>4. Be a Source of Inspiration</strong></p><p>A leader''s duties extend beyond managing a business and making decisions. They also include inspiring and motivating team members. Leaders who motivate their employees will find it easier to convince them to follow. You can become an inspiring leader by being open, taking responsibility, creating positive change, making unselfish decisions, and having a vision that others can follow.</p><p><strong>5. Accept and Respond to Feedback</strong></p><p>A good leader understands that they can make better decisions if they listen to feedback from team members.</p><p><strong>6. Learn to Be Adaptable and Flexible</strong></p><p>Plans sometimes do not work out the way you envisioned. A good leader will be adaptable and flexible in order to accommodate changes.</p>","mode":"scrolling"}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '40159bf4-3d2c-4c77-99d3-e0e6ff171d5b',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>[Illustrated tip panels — same 6 tips as above with accompanying visuals]</p>","mode":"scrolling"}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '92cb2ca1-0986-4fc8-806f-15e0751b8db9',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Examining Ineffective Leadership Behaviours:</strong></p><ol><li>Micromanagement</li><li>Distrust of team</li><li>Lack of confidence in team</li><li>Lack of direction</li><li>Lack of empathy</li><li>Tendency to create negative work environment — leading to low morale of team</li><li>No continued learning to improve skills</li><li>Inability to adapt to change</li></ol>","mode":"scrolling"}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'b6730763-c87d-4c07-89ef-648ca299f4e5',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>[Detailed illustrated map of all 10 leadership styles — see Lesson 5 for full descriptions]</p>","mode":"scrolling"}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '072d55ce-b91f-4351-9593-4d418884a6ca',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the impact of effective leadership on employee satisfaction and productivity?","options":["It improves employee satisfaction and productivity.","It has no impact on employee satisfaction and productivity.","It decreases employee satisfaction and productivity.","It only improves employee satisfaction but not productivity."],"correct_answer":"It improves employee satisfaction and productivity.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '9463897f-7bba-458c-9ac8-cff22742c1e1',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which leadership style involves minimal guidance and allows team members to make decisions independently?","options":["Laissez-faire leadership","Autocratic leadership","Democratic leadership","Transformational leadership"],"correct_answer":"Laissez-faire leadership","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  8,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1fdbb9af-219a-4d9c-81ee-4d8175aa9f52',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is a common behavior displayed by ineffective leaders?","options":["Micromanagement","Empathy","Clear direction"],"correct_answer":"Micromanagement","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  9,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'cf0528cb-f1d2-4783-9f64-9bc0bb044467',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is a key quality possessed by effective leaders?","options":["Integrity","Indecisiveness","Dishonesty","Inflexibility"],"correct_answer":"Integrity","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  10,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '4a8e3d11-5175-4f43-a6d5-b2a3135385d6',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the focus of transactional leadership?","options":["Setting clear expectations and providing rewards based on performance","Encouraging creativity and innovation","Prioritizing the needs of team members","Challenging the status quo and creating a vision"],"correct_answer":"Setting clear expectations and providing rewards based on performance","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  11,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '2a8ee6d7-6b7f-49da-9a51-50d45267699c',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Discussion/Self-evaluation</strong></p><p>Perform a self-evaluation or reflection on some of the following points. Alternatively, find a partner to discuss:</p><ul><li>Common mistakes made by leaders</li><li>Consequences of poor leadership</li><li>Strategies for avoiding or overcoming common leadership pitfalls or mistakes</li><li>How to handle conflicts and challenges within teams</li><li>Ethical dilemmas faced by leaders</li><li>Adaptability to organizational change (embracing or resisting?)</li></ul>","mode":"scrolling"}'::jsonb,
  12,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '9fe56f8f-5588-4c68-8071-2e763bc52bcc',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Reflection</strong></p><p>For your reflection, you should:</p><ul><li>Recap the key learnings from the module</li><li>Reflect on personal insights and growth as a result of the module</li></ul>","mode":"scrolling"}'::jsonb,
  13,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '5a4611e5-0cd5-4dd8-9da1-7e324de5ea95',
  '2d22e4ba-f202-46dd-8e1c-0a730a03601f',
  'f1d3eb7e-6cb6-41bc-ad9a-99e05183665b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Summary</strong></p><p>Leadership is a multifaceted, ever-evolving field. Effective leaders possess a firm understanding of themselves and of their team, which enables them to successfully navigate the complex world of leadership. They leverage their emotional intelligence, their adaptability, vision, and influence to inspire and guide their teams toward success.</p><p><strong>Effective leadership is not about power or control — it is about empowering others, fostering growth, and creating positive impact.</strong></p>","mode":"scrolling"}'::jsonb,
  14,
  true,
  '{}',
  1
);

-- ──────────────────────────────────────────────────────────
-- Module 5: Project Management
-- ──────────────────────────────────────────────────────────

INSERT INTO courses (id, title, slug, description, institution_id, status, thumbnail_url, is_published, category_id)
VALUES (
  '73ab4867-f29a-4bd3-b9bf-5f84705d9747',
  'Project Management',
  'project-management',
  'Module 5 of the GANSID Capacity Building Curriculum.',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'published',
  NULL,
  true,
  NULL
);

INSERT INTO modules (id, course_id, institution_id, title, description, order_index, is_published)
VALUES (
  '66cfcb6c-54eb-41da-a3f2-b9229530ec4f',
  '73ab4867-f29a-4bd3-b9bf-5f84705d9747',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'Project Management',
  'Module 5: Project Management',
  0,
  true
);

-- Lesson 0: Introduction
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'aac6d33c-5ff1-4b7b-8fa2-7811c6ad8b20',
  '73ab4867-f29a-4bd3-b9bf-5f84705d9747',
  '66cfcb6c-54eb-41da-a3f2-b9229530ec4f',
  'Introduction',
  0,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'd9d77918-d793-41cd-9213-ad0d22bc8d23',
  'aac6d33c-5ff1-4b7b-8fa2-7811c6ad8b20',
  'content',
  'Introduction',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '8b88698b-56e9-4c89-ad61-8c6f76727441',
  'aac6d33c-5ff1-4b7b-8fa2-7811c6ad8b20',
  'd9d77918-d793-41cd-9213-ad0d22bc8d23',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>In this module, learners will acquire essential project management skills tailored for patient advocacy organizations. You''ll learn how to effectively plan, execute, and evaluate projects that enhance patient support and advocacy efforts. This module provides the tools to transform organizational goals into impactful, well-managed projects.</strong></p><p><em>Author: Ayokanmi Ogbimi, PMP | Image credits: Canva</em></p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 1: Disclaimer
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'cd2b6bdb-10f2-464b-9000-08946eb60996',
  '73ab4867-f29a-4bd3-b9bf-5f84705d9747',
  '66cfcb6c-54eb-41da-a3f2-b9229530ec4f',
  'Disclaimer',
  1,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '3627d154-2716-4e88-95c1-df385e73294f',
  'cd2b6bdb-10f2-464b-9000-08946eb60996',
  'content',
  'Disclaimer',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'bd91e10a-f120-4419-9430-22ac076f395d',
  'cd2b6bdb-10f2-464b-9000-08946eb60996',
  '3627d154-2716-4e88-95c1-df385e73294f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>The Capacity Building Curriculum (\\"Curriculum\\") may be used strictly for educational, non-commercial purposes. By permitting such use, The Global Action Network for Sickle Cell & Other Inherited Blood Disorders (GANSID) does not grant any broader license or waive any of its or any contributor''s rights under copyright or otherwise at law.</p><p>This Curriculum has been developed as an educational tool for patient organizations and advocates. The GANSID assumes no liability for any inaccurate or incomplete information contained in this Curriculum, nor any actions taken in reliance thereon. You assume full responsibility for the use of any information provided.</p><p>The information contained herein has been supplied by individual subject matter contributors without verification by us. The information is provided \\"AS IS\\" and GANSID assumes no obligation to update the information or advise on further developments concerning the topics mentioned.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 2: Lesson Objectives
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '04b75913-17c4-4645-8c02-f90ad19d6b8e',
  '73ab4867-f29a-4bd3-b9bf-5f84705d9747',
  '66cfcb6c-54eb-41da-a3f2-b9229530ec4f',
  'Lesson Objectives',
  2,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '8969d840-d35c-4a4c-bdca-6b5270c0f6b6',
  '04b75913-17c4-4645-8c02-f90ad19d6b8e',
  'content',
  'Lesson Objectives',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f1937c8a-39d6-4cbb-96ee-dd262a5536ff',
  '04b75913-17c4-4645-8c02-f90ad19d6b8e',
  '8969d840-d35c-4a4c-bdca-6b5270c0f6b6',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>By the end of this module, learners will be able to:</p><ul><li>Understand the fundamental concepts, principles, and terminology of project management</li><li>Develop the ability to create comprehensive project plans, including defining project scope, objectives, deliverables, and timelines</li><li>Acquire skills in project scheduling, resource allocation, and budget management</li><li>Learn how to effectively communicate with stakeholders, team members, and other project participants</li><li>Gain knowledge of project risk management techniques and strategies to mitigate potential issues</li><li>Develop leadership and team management skills to motivate and coordinate project team members</li><li>Enhance problem-solving and decision-making abilities to address challenges and make timely adjustments to project plans</li></ul>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 3: What is Project Management?
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '4744c698-129c-4e2c-bd63-de658ffc14e1',
  '73ab4867-f29a-4bd3-b9bf-5f84705d9747',
  '66cfcb6c-54eb-41da-a3f2-b9229530ec4f',
  'What is Project Management?',
  3,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '022b37f6-ec51-471f-9ea5-21c09e1ba832',
  '4744c698-129c-4e2c-bd63-de658ffc14e1',
  'content',
  'What is Project Management?',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd6a92c63-0e54-4150-b800-8d4ff52ed3bd',
  '4744c698-129c-4e2c-bd63-de658ffc14e1',
  '022b37f6-ec51-471f-9ea5-21c09e1ba832',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Context to Project Management</strong></p><p>Project management is the practice of initiating, planning, executing, controlling, and closing the work of a team to achieve specific goals and meet specific success criteria within a specified time frame. It involves the application of knowledge, skills, tools, and techniques to project activities to meet project requirements.</p><p>Project management is crucial in ensuring that projects are completed efficiently, on time, and within budget while delivering the desired outcomes.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 4: Project Management Phases
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '8e87c191-1212-46d0-bc8a-759da2dcd11f',
  '73ab4867-f29a-4bd3-b9bf-5f84705d9747',
  '66cfcb6c-54eb-41da-a3f2-b9229530ec4f',
  'Project Management Phases',
  4,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '97a0d781-f264-4db1-9cec-0f733def642a',
  '8e87c191-1212-46d0-bc8a-759da2dcd11f',
  'content',
  'Project Management Phases',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'fe5cc1d1-b96b-4707-841e-de5d045abfc3',
  '8e87c191-1212-46d0-bc8a-759da2dcd11f',
  '97a0d781-f264-4db1-9cec-0f733def642a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Project Management Phases</strong></p><p>Project management typically involves several phases, each crucial for ensuring the successful completion of a project. These phases may vary depending on the project management methodology used, but they commonly include:</p><ol><li>Initiation Phase</li><li>Planning Phase</li><li>Execution Phase</li><li>Monitoring and Controlling Phase</li><li>Closing Phase</li></ol>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a22e5910-7fa7-4dbc-84d0-78c2fe5fb4f2',
  '8e87c191-1212-46d0-bc8a-759da2dcd11f',
  '97a0d781-f264-4db1-9cec-0f733def642a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Initiation Phase</strong></p><ul><li>Define the project''s purpose, goals, and objectives</li><li>Identify stakeholders and establish communication channels</li><li>Conduct feasibility studies and assess risks</li><li>Develop a project charter or initiation document</li></ul>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '344f6fd3-63c6-462d-af04-ce3b60288df4',
  '8e87c191-1212-46d0-bc8a-759da2dcd11f',
  '97a0d781-f264-4db1-9cec-0f733def642a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Planning Phase</strong></p><ul><li>Define project scope, deliverables, and requirements</li><li>Create a detailed project plan, including schedules, budgets, and resource allocation</li><li>Identify tasks, dependencies, and milestones</li><li>Develop risk management and quality assurance plans</li><li>Obtain necessary approvals and agreements</li></ul>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '4aea529c-9eed-4424-871d-ea6b66c4e2d1',
  '8e87c191-1212-46d0-bc8a-759da2dcd11f',
  '97a0d781-f264-4db1-9cec-0f733def642a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Execution Phase</strong></p><ul><li>Implement the project plan by executing tasks and activities</li><li>Manage project resources, including team members, equipment, and materials</li><li>Monitor progress against the project plan and adjust as necessary</li><li>Address issues, risks, and changes as they arise</li><li>Ensure effective communication and collaboration among team members</li></ul>","mode":"scrolling"}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '78daef36-4fe4-441f-b456-6a05679716c5',
  '8e87c191-1212-46d0-bc8a-759da2dcd11f',
  '97a0d781-f264-4db1-9cec-0f733def642a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Monitoring and Controlling Phase</strong></p><ul><li>Track project performance using key performance indicators (KPIs) and metrics</li><li>Monitor project progress, costs, and quality</li><li>Identify and address variances from the project plan</li><li>Conduct regular status meetings and reporting</li><li>Implement changes and corrective actions as needed</li></ul>","mode":"scrolling"}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '3a442f9b-ef0f-4ee8-a3c8-7a0f8d6d5bc4',
  '8e87c191-1212-46d0-bc8a-759da2dcd11f',
  '97a0d781-f264-4db1-9cec-0f733def642a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Closing Phase</strong></p><ul><li>Complete all project deliverables and obtain formal acceptance from stakeholders</li><li>Conduct a project review or retrospective to evaluate lessons learned</li><li>Archive project documentation and resources</li><li>Hand over deliverables to the client or end users</li><li>Celebrate project success and acknowledge team contributions</li></ul>","mode":"scrolling"}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '842fbc78-5f89-438e-bc77-4031a282531e',
  '8e87c191-1212-46d0-bc8a-759da2dcd11f',
  '97a0d781-f264-4db1-9cec-0f733def642a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the purpose of the Monitoring and Controlling Phase in project management?","options":["Track project performance and address variances from the plan","Define project scope and requirements","Implement the project plan by executing tasks and activities","Complete project deliverables and obtain formal acceptance"],"correct_answer":"Track project performance and address variances from the plan","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '0d942f0f-1afc-4dd3-8f4c-f45f2d5ec669',
  '8e87c191-1212-46d0-bc8a-759da2dcd11f',
  '97a0d781-f264-4db1-9cec-0f733def642a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the main goal of the Planning Phase in project management?","options":["Define project scope, deliverables, and requirements","Implement the project plan by executing tasks and activities","Track project performance and address variances from the plan","Complete all project deliverables and obtain formal acceptance"],"correct_answer":"Define project scope, deliverables, and requirements","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a500ad2f-faf4-45fe-9ae5-963ab4af244a',
  '8e87c191-1212-46d0-bc8a-759da2dcd11f',
  '97a0d781-f264-4db1-9cec-0f733def642a',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which phase of project management involves identifying stakeholders and establishing communication channels?","options":["Initiation Phase","Planning Phase","Execution Phase","Closing Phase"],"correct_answer":"Initiation Phase","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  8,
  true,
  '{}',
  1
);

-- Lesson 5: Project Management Fundamentals
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  '73ab4867-f29a-4bd3-b9bf-5f84705d9747',
  '66cfcb6c-54eb-41da-a3f2-b9229530ec4f',
  'Project Management Fundamentals',
  5,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '9b27a2c2-e366-43ed-b2e6-696c035e8da9',
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  'content',
  'Project Management Fundamentals',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e6f5df0e-e509-41a2-9c0e-af498a906da7',
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  '9b27a2c2-e366-43ed-b2e6-696c035e8da9',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Project Management Fundamentals</strong></p><p>Project management fundamentals serve as the cornerstone for successful project execution. These principles guide project managers through every stage of a project, from initiation to completion.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '67af67fb-7d4a-44ad-a51c-1e862ae8687e',
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  '9b27a2c2-e366-43ed-b2e6-696c035e8da9',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Understanding the Basics</strong></p><p>First, grasp what project management is all about — the language, terms, concepts, and principles that form the foundation of every successful project.</p>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '83a84b73-7fe1-4c2b-afaa-4d8dce00c7d1',
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  '9b27a2c2-e366-43ed-b2e6-696c035e8da9',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Planning Like a Pro</strong></p><p>Learn how to plan your journey effectively:</p><ul><li>Set clear goals</li><li>Create a timeline</li><li>Determine what resources you''ll need</li></ul>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '8e18b62b-5c0f-4532-a53b-0156079a1ec1',
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  '9b27a2c2-e366-43ed-b2e6-696c035e8da9',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Putting Plans into Action</strong></p><p>Once your plan is ready, coordinate tasks and assign roles. The <strong>RACI matrix</strong> (Responsible, Accountable, Consulted, Informed) is a key tool for clarifying roles and responsibilities for every task and decision.</p>","mode":"scrolling"}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '60f3a66b-0764-449c-823d-d37c33963c18',
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  '9b27a2c2-e366-43ed-b2e6-696c035e8da9',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Monitoring Progress</strong></p><p>Check in regularly to see how things are going and make adjustments as needed to stay on track against the original plan.</p>","mode":"scrolling"}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1213f27a-472e-4df1-8107-0f78925790e2',
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  '9b27a2c2-e366-43ed-b2e6-696c035e8da9',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Dealing with Challenges</strong></p><p>Handle unexpected problems, stay calm under pressure, and find creative solutions to keep the project moving forward.</p>","mode":"scrolling"}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '8d8dcb3f-d5c4-4867-9a80-622a375b9c5e',
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  '9b27a2c2-e366-43ed-b2e6-696c035e8da9',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Working with Others</strong></p><p>Projects are rarely solo adventures:</p><ul><li>Communicate effectively with your team</li><li>Delegate tasks appropriately</li><li>Foster a positive working environment</li></ul>","mode":"scrolling"}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c97c24a4-c43b-4c24-8a75-81a0cbac6b51',
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  '9b27a2c2-e366-43ed-b2e6-696c035e8da9',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Reflecting and Improving</strong></p><p>Once you reach your destination, take time to reflect:</p><ul><li>What went well?</li><li>What could have been better?</li></ul><p>This retrospective process helps you learn and become a better project manager in the future.</p>","mode":"scrolling"}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '559b72c7-43da-43aa-bd81-6d3c7bcac4f4',
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  '9b27a2c2-e366-43ed-b2e6-696c035e8da9',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the purpose of the RACI matrix in project management?","options":["To clarify roles and responsibilities for tasks or decisions","To track project progress and make adjustments as needed","To handle unexpected problems and find creative solutions","To communicate effectively with the project team"],"correct_answer":"To clarify roles and responsibilities for tasks or decisions","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  8,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '993e3982-feb6-4b01-9384-83fc725a4ac2',
  '7f6aba1f-e9ca-4a27-8ea0-4d3ec6a82fa6',
  '9b27a2c2-e366-43ed-b2e6-696c035e8da9',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which phase of project management involves coordinating tasks and assigning roles to team members?","options":["Putting Plans into Action","Understanding the Basics","Planning Like a Pro","Reflecting and Improving"],"correct_answer":"Putting Plans into Action","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  9,
  true,
  '{}',
  1
);

-- Lesson 6: Project Management in Healthcare
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  '73ab4867-f29a-4bd3-b9bf-5f84705d9747',
  '66cfcb6c-54eb-41da-a3f2-b9229530ec4f',
  'Project Management in Healthcare',
  6,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'content',
  'Project Management in Healthcare',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '7154c11a-6cf4-4eec-875f-e1dbc4a6dc8e',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Effective Project Management in Healthcare</strong></p><p>Effective project management is essential for addressing complex challenges and improving patient outcomes. The key components are:</p><ol><li>Needs Assessment</li><li>Goal Setting</li><li>Stakeholder Engagement</li><li>Resource Allocation</li><li>Risk Management</li><li>Implementation Plan</li><li>Monitoring and Evaluation</li><li>Documentation and Reporting</li><li>Sustainability Planning</li><li>Continuous Improvement</li></ol>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '909bd770-c96d-4fb6-8e58-d87d5b4780d3',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Needs Assessment</strong></p><p><em>Definition:</em> A systematic process of gathering and analyzing information to identify the specific needs, preferences, and challenges faced by individuals, families, or communities in the context of healthcare.</p><p><em>Implementation:</em></p><ul><li>Conduct thorough needs assessments through surveys, interviews, or focus groups</li><li>Analyze demographic data, health disparities, and community health indicators for a comprehensive understanding of the healthcare landscape</li><li>Incorporate patient feedback and community stakeholder input to ensure projects are tailored to the diverse needs of the population served</li></ul>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1f3b8295-4903-4c14-ac83-11afcc76f9a2',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Goal Setting</strong></p><p><em>Definition:</em> Establishing clear and measurable objectives that define the desired outcomes of a healthcare project or intervention. Particularly crucial in projects aimed at enhancing access to healthcare services, increasing awareness, or strengthening support networks.</p><p><em>Implementation:</em></p><ul><li>Set <strong>SMART</strong> goals (Specific, Measurable, Achievable, Relevant, Time-bound) to ensure clarity and accountability</li><li>Establish benchmarks and performance indicators to monitor progress and evaluate impact</li></ul>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'bb08297c-87fa-4822-b33f-ae6a0da0155d',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Stakeholder Engagement</strong></p><p><em>Definition:</em> Involving patients, caregivers, healthcare professionals, advocacy groups, policymakers, and others with a vested interest or influence in a healthcare project or initiative. Ensures that stakeholder insights guide project planning and implementation, fostering collaboration and buy-in.</p><p><em>Implementation:</em></p><ul><li>Identify and map all relevant stakeholders early</li><li>Establish regular communication channels and feedback loops</li><li>Involve stakeholders in key decisions to build ownership and sustainability</li></ul>","mode":"scrolling"}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e94ea19b-a63b-4fa0-aed3-45a1dc7c4f42',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Resource Allocation</strong></p><p><em>Definition:</em> Determining the necessary resources — financial, human, technological, and material — needed to support a healthcare project or intervention.</p><p><em>Implementation:</em></p><ul><li>Assess resource needs and constraints to develop budgets and allocate resources effectively</li><li>Prioritize resource allocation based on project objectives and expected outcomes</li></ul>","mode":"scrolling"}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '173abed2-2006-41ea-8a6b-c9ae36936927',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Risk Management</strong></p><p><em>Definition:</em> The process of identifying, assessing, and mitigating potential risks that may impact the success of a healthcare project or initiative. Examples include regulatory compliance issues or resource constraints.</p><p><em>Implementation:</em></p><ul><li>Identify potential risks and their impact on project objectives</li><li>Develop strategies to mitigate risks and implement contingency plans</li><li>Monitor risks throughout the project lifecycle and adjust plans as needed</li></ul>","mode":"scrolling"}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'fe997b69-1a91-444f-bbf4-c63241fad410',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Implementation Plan</strong></p><p><em>Definition:</em> A detailed roadmap outlining the specific activities, tasks, timelines, milestones, and responsibilities required to achieve the objectives of a healthcare project or intervention.</p><p><em>Implementation:</em></p><ul><li>Develop detailed timelines and assign responsibilities to team members</li><li>Establish monitoring mechanisms to track progress and make adjustments as needed</li></ul>","mode":"scrolling"}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c25498ce-c17c-40ef-9abb-81604c9164cf',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Monitoring and Evaluation</strong></p><p><em>Definition:</em> Systematically tracking project progress, assessing performance, and measuring the impact of healthcare interventions on patient outcomes.</p><p><em>Implementation:</em></p><ul><li>Establish metrics and indicators to measure progress and evaluate impact</li><li>Collect data, analyze performance, and identify areas for improvement</li><li>Utilize feedback from stakeholders and evaluation findings to inform decision-making</li></ul>","mode":"scrolling"}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '63100291-af92-4708-aa09-e03e2227ca4b',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Documentation and Reporting</strong></p><p><em>Definition:</em> Maintaining accurate records — including meeting minutes, progress reports, financial statements, and evaluation findings — to document project activities and outcomes.</p><p><em>Implementation:</em></p><ul><li>Maintain detailed records of project activities and outcomes</li><li>Regularly report progress to stakeholders to ensure transparency and accountability</li></ul>","mode":"scrolling"}'::jsonb,
  8,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd8319286-14bb-47a0-894b-ac8bbfc0143e',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Sustainability Planning</strong></p><p><em>Definition:</em> Developing strategies to ensure the long-term impact and viability of healthcare projects and interventions beyond the initial funding or implementation period.</p><p><em>Implementation:</em></p><ul><li>Identify opportunities for long-term partnerships and funding</li><li>Advocate for policy changes to support project sustainability</li><li>Build community capacity and resources to sustain project outcomes</li></ul>","mode":"scrolling"}'::jsonb,
  9,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'abc58c8e-4c9a-4ac3-9e47-be70e62a0af6',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Continuous Improvement</strong></p><p><em>Definition:</em> The ongoing process of identifying areas for enhancement, implementing changes, and evaluating outcomes to improve the effectiveness and efficiency of healthcare projects and interventions.</p><p><em>Implementation:</em></p><ul><li>Solicit feedback from stakeholders and team members to identify areas for improvement</li><li>Evaluate project performance and integrate lessons learned into future initiatives</li><li>Foster a culture of learning and innovation to drive continuous improvement</li></ul>","mode":"scrolling"}'::jsonb,
  10,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'bd7e7ba9-ec3e-402d-b927-fa58ea0cdadc',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the purpose of conducting a needs assessment in healthcare projects?","options":["To identify specific needs, preferences, and challenges faced by individuals, families, or communities","To analyze demographic data and community health indicators","To establish clear and measurable objectives for the project","To involve individuals, groups, or organizations with a vested interest in the project"],"correct_answer":"To identify specific needs, preferences, and challenges faced by individuals, families, or communities","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  11,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '2b4f7fae-4b4d-49c9-9980-03f16a2af94a',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can an implementation plan contribute to the success of a healthcare project?","options":["By outlining specific activities, timelines, and responsibilities required to achieve project objectives","By involving individuals, groups, or organizations with a vested interest or influence","By establishing clear and measurable objectives for the project","By assessing resource needs and constraints"],"correct_answer":"By outlining specific activities, timelines, and responsibilities required to achieve project objectives","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  12,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a95bad36-1c49-4366-a270-c2a99c390694',
  '74a5986f-8b7d-4259-b61e-5bcef5d4bdd5',
  'f31f2fe0-5094-439f-936c-5ff204f19e13',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can stakeholder engagement contribute to the success of a healthcare project?","options":["By involving individuals, groups, or organizations with a vested interest or influence","By conducting surveys, interviews, or focus groups","By establishing clear and measurable objectives for the project","By assessing resource needs and constraints"],"correct_answer":"By involving individuals, groups, or organizations with a vested interest or influence","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  13,
  true,
  '{}',
  1
);

-- ──────────────────────────────────────────────────────────
-- Module 6: Effective Communication
-- ──────────────────────────────────────────────────────────

INSERT INTO courses (id, title, slug, description, institution_id, status, thumbnail_url, is_published, category_id)
VALUES (
  '4d759125-3682-4698-83ae-8ba5a0e7630b',
  'Effective Communication',
  'effective-communication',
  'Module 6 of the GANSID Capacity Building Curriculum.',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'published',
  NULL,
  true,
  NULL
);

INSERT INTO modules (id, course_id, institution_id, title, description, order_index, is_published)
VALUES (
  'e0926dbb-4645-4495-a938-ed22467ddb7e',
  '4d759125-3682-4698-83ae-8ba5a0e7630b',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'Effective Communication',
  'Module 6: Effective Communication',
  0,
  true
);

-- Lesson 0: Introduction
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '95d70e16-30ea-4d40-a23f-ba3b5836d0d1',
  '4d759125-3682-4698-83ae-8ba5a0e7630b',
  'e0926dbb-4645-4495-a938-ed22467ddb7e',
  'Introduction',
  0,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '4bd8c7f7-64ad-4a5a-bc87-b00fd5ebf80e',
  '95d70e16-30ea-4d40-a23f-ba3b5836d0d1',
  'content',
  'Introduction',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '4814b33b-987a-4de8-ba89-0493c8ddf649',
  '95d70e16-30ea-4d40-a23f-ba3b5836d0d1',
  '4bd8c7f7-64ad-4a5a-bc87-b00fd5ebf80e',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Introduction to the Effective Communication Module</p><p><strong>Prompt:</strong> Scroll to see more</p><p>In this module, learners will master the skills and understanding needed to effectively communicate with key organizational stakeholders.</p><p>Authors: Chloe Jang, Fisola Olayera MCISc., RO, CHE.Image credits: Canva, www.freepik.com</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 1: Disclaimer
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '1a93cae2-c883-4de3-8a3f-c91885fbce4c',
  '4d759125-3682-4698-83ae-8ba5a0e7630b',
  'e0926dbb-4645-4495-a938-ed22467ddb7e',
  'Disclaimer',
  1,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '06c617e6-6195-472b-9939-68cebddb8906',
  '1a93cae2-c883-4de3-8a3f-c91885fbce4c',
  'content',
  'Disclaimer',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6423a512-4b58-47f4-9b0b-67035acfe7dd',
  '1a93cae2-c883-4de3-8a3f-c91885fbce4c',
  '06c617e6-6195-472b-9939-68cebddb8906',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Disclaimer</p><p><strong>Prompt:</strong> Scroll to see more</p><p>The Capacity Building Curriculum (\\"Curriculum\\") may be used strictly for educational, non-commercial purposes. By permitting such use The Global Action Network for Sickle Cell & Other Inherited Blood Disorders (GANSID) does not grant any broader license or waive any of its or any contributor''s rights under copyright or otherwise at law.This Curriculum has been developed as an educational tool for patient organizations and advocates. The GANSID assumes no liability for any inaccurate or incomplete information contained in this Curriculum, nor any actions taken in reliance thereon. You assume full responsibility for the use of any information provided. The information contained herein has been supplied by individual subject matter contributors without verification by us. The information is provided \\"AS IS\\" and GANSID assumes no obligation to update the information or advise on further developments concerning the topics mentioned. GANSID will not be responsible or liable in any way for the accuracy, relevancy, or copyright compliance of the material contained in this Curriculum. By viewing and using any information derived from the Curriculum, you hereby waive any claims, causes of action, and demands, whether in tort or contract, against GANSID (including its content creators, staff, directors, officers, and agents) and contributors, in any way related to use of the Curriculum or the information derived from it.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 2: Learning Objectives
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'd316c081-41ce-4cf4-8015-d9fa84c0ed48',
  '4d759125-3682-4698-83ae-8ba5a0e7630b',
  'e0926dbb-4645-4495-a938-ed22467ddb7e',
  'Learning Objectives',
  2,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '061da181-23f9-484a-a022-d6510c964b48',
  'd316c081-41ce-4cf4-8015-d9fa84c0ed48',
  'content',
  'Learning Objectives',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd0008608-793b-4883-aa33-c1f84081614f',
  'd316c081-41ce-4cf4-8015-d9fa84c0ed48',
  '061da181-23f9-484a-a022-d6510c964b48',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Following completion of this module, patient organizations will be able to:</p><ul><li>Learn how to build a culture of openness, transparency, and inclusivity.</li><li>Improve their engagement with public audiences through contexts of in-person and virtual meetings.</li><li>Elevate their social media presence.</li><li>Apply critical thinking skills from the knowledge gained in this course module to their locality or country based on the case studies presented.</li></ul>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 3: Context to the Effective Communication Module
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '4da823f7-25b8-482b-b050-1d4d3c6ffed6',
  '4d759125-3682-4698-83ae-8ba5a0e7630b',
  'e0926dbb-4645-4495-a938-ed22467ddb7e',
  'Context to the Effective Communication Module',
  3,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '50908f6f-4761-46d4-b284-d5932f748399',
  '4da823f7-25b8-482b-b050-1d4d3c6ffed6',
  'content',
  'Context to the Effective Communication Module',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '19f5bfd0-b32f-407a-8db1-bdcaeb61aa2d',
  '4da823f7-25b8-482b-b050-1d4d3c6ffed6',
  '50908f6f-4761-46d4-b284-d5932f748399',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Context to Effective Communication</p><p><strong>Prompt:</strong> Scroll to see more</p><p>Effective communication is an essential skill for leaders in patient advocacy organizations to ensure the efficient use of resources, successful execution of projects and tasks, and proper management of teams.</p><p>Communication is a multi-faceted skill that encompasses internal exchanges within your organization and external interactions with partners, government or community representatives, and patients. In this module, we provide you with the tools to handle frequent scenarios where effective communication can make or break a situation.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 4: Communicate as a Leader
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '4d759125-3682-4698-83ae-8ba5a0e7630b',
  'e0926dbb-4645-4495-a938-ed22467ddb7e',
  'Communicate as a Leader',
  4,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  'content',
  'Communicate as a Leader',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '50500b2e-f66c-4998-b20c-7eef2af4b84f',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Speaking Professionally</p><p><strong>Prompt:</strong> Scroll to see more</p><p>As a member of your advocacy group, you are the face of the organization, representing its values, mission, and objectives. Professional communication reflects positively on the organization and inspires trust among stakeholders, including patients, donors, volunteers, and partners.</p><p>Through this program, you will learn how to: Prepare and deliver messages confidently and effectively. Establish connection and rapport with the audience. Customize messages to resonate with the audience''s needs and preferences.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e19feb4c-f619-4079-94dc-4ba84c50a2b5',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Come Prepared and Be Organized</p><p><strong>Prompt:</strong> Scroll to see more</p><p>Gather relevant information and materials beforehand Organize your thoughts and structure your presentation/conversation in a clear and logical manner</p>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '055374b8-36e9-4d87-9c74-c3bc68e945f1',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Understand Your Audience</p><p><strong>Prompt:</strong> Select each image for more details</p><ul><li>Conduct research or gather insights to understand the demographics, preferences, and expectations of your audience.</li><li>Anticipate potential questions or concerns your audience may have and prepare responses accordingly.</li></ul>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '7fa62deb-1a1a-4ecd-ad86-9fe03e6a1d1a',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Tailor Your Message</p><p><strong>Prompt:</strong> Select an item to see more</p><p><strong>Customize</strong></p><p>Customize your message to resonate with your specific audience, considering their background, interests, and knowledge level.</p><p><strong>Adapt</strong></p><p>Adapt your communication style and tone to suit the preferences and expectations of your audience.</p>","mode":"scrolling"}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '63082aad-4963-44ad-8d35-4921753ff3cf',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Focus on Outcomes</p><p><strong>Prompt:</strong> Drag to reveal the content</p><p>Clearly define the desired outcomes or objectives of your message and communicate them to your audience during the introduction of your speech or presentation.</p><p>Emphasize the impact or benefits your message will have on the audience to align their expectations with your goals.</p>","mode":"scrolling"}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'b8371e32-de5e-4183-b1e5-8d86a17ea47d',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Establish Credibility</p><p><strong>Prompt:</strong> Read more</p><ol><li>Highlight your credibility by referencing reputable sources, providing relevant data or statistics, and sharing lived experience stories when appropriate.</li><li>Build trust with your audience by demonstrating expertise, authenticity, and transparency in your communication.</li></ol>","mode":"scrolling"}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'da00aa90-56c2-4789-95e2-bfb5dd0bb423',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Use Storytelling Where Appropriate</p><ul><li>Incorporate storytelling techniques to make your message more engaging and memorable, particularly when conveying complex or abstract concepts.</li><li>Use real-life examples or personal anecdotes to illustrate key points and connect with your audience emotionally.</li></ul>","mode":"scrolling"}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'ae5acf28-8931-4c14-a7d2-a6712df3bb00',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Establish Rapport</p><p><strong>Prompt:</strong> Scroll to see more</p><p>Build trust and connect with your audience by smiling, acknowledging responses, and echoing their sentiments.</p><p>Use inclusive language and address the concerns or interests of your audience to create a connection.Pay Attention to Feedback: Monitor verbal and non-verbal cues such as questions, nods, facial expressions, and body language to gauge rapport.</p>","mode":"scrolling"}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '35562952-2f91-4487-a815-d9d32e731205',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Utilize Nonverbal Communication Effectively</p><p><strong>Prompt:</strong> Read more</p><ol><li>Use pauses strategically to emphasize key points, allow for audience reflection, and maintain control of the conversation.</li><li>Minimize the use of filler words like \\"um\\" or \\"uh\\" to enhance your speech''s clarity</li><li>Maintain good eye contact with your audience to convey confidence, sincerity, and engagement.</li><li>Pay attention to body language, including posture, gestures, and facial expressions, to reinforce your message and establish rapport with your audience.</li><li>Vary the intonation of your voice and pace of speech to keep your audience engaged and emphasize important information.</li></ol>","mode":"scrolling"}'::jsonb,
  8,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd798ab6b-f3da-4654-aa0b-a896737ed5ca',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is it important to tailor your message to your audience?","options":["To impress the audience with your knowledge.","To ensure that your message resonates with the audience and meets their needs.","To demonstrate your authority as a speaker.","To confuse the audience with complex language."],"correct_answer":"To ensure that your message resonates with the audience and meets their needs.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  9,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c9c63c4f-66c7-49e5-9dcb-fdee5fad8613',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> What is one strategy for establishing credibility when speaking professionally?</p><p><strong>Prompt:</strong> Swipe to select an answer</p><ul><li>Using excessive jargon to demonstrate expertise.</li><li>Sharing personal anecdotes unrelated to the topic.</li><li>Referencing reputable sources and providing relevant data.</li><li>Avoiding eye contact with the audience.</li></ul>","mode":"scrolling"}'::jsonb,
  10,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '3b7e89b9-e60c-45af-b167-b14e907fe1b8',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can nonverbal communication enhance the effectiveness of your speech?","options":["By conveying confidence, sincerity, and engagement.","By distracting the audience from the main message.","By using filler words to fill pauses in speech.","By speaking in a monotone voice to maintain neutrality."],"correct_answer":"By conveying confidence, sincerity, and engagement.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  11,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '3f9d2223-c634-4e97-b829-f082bef9ce3c',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Dealing with Interpersonal Conflict and Difficult Audiences</p><p><strong>Prompt:</strong> Scroll to see more</p><p>Encountering challenging individuals or groups in your advocacy work is inevitable due to diverse communication styles and personalities. While diversity can enrich discussions, it may also lead to conflicts or disruptions. Thus, mastering strategies for handling difficult audiences is crucial. In this section, you will learn how to resolve interpersonal conflicts, recognize common behaviors of challenging participants in group discussions, and respond in a composed, effective, and professional manner.</p><p>In this module, you will learn how to:Identify, manage, and resolve interpersonal conflict. Recognize and resolve tense or uncomfortable situations within an audience. Display professionalism when dealing with challenging audience members.</p>","mode":"scrolling"}'::jsonb,
  12,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '44435a8a-4855-4339-a431-8a55901f99cb',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Understanding Conflict</p><p><strong>Prompt:</strong> Select each item to find out more</p><p><strong>What is Conflict?</strong></p><p>Conflict arises from disagreements or differing interests between individuals or groups.</p><p><strong>What Causes Conflict?</strong></p><p>Conflicts may stem from differences in values, goals, communication styles, or resource allocation.</p>","mode":"scrolling"}'::jsonb,
  13,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f71fe73d-f664-42a9-9129-67049778e8d4',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Prompt:</strong> Swipe to continue</p><ul><li>Effective Strategies for Conflict Resolution</li><li>Be ProactiveWhen issues arise, listen to those concerns and consider how best to address the situation. Investigate potential conflicts early on to prevent escalation.</li><li>Seek to Understand All Sides Approach individuals involved in the conflict in an open, non-confrontational, and non-defensive manner to gather information about the situation. Conversations should be held in an open yet private place.</li><li>Listen Actively Hear out all perspectives without interrupting, demonstrating empathy and understanding.</li><li>Find Common GroundIdentify shared interests or goals to facilitate compromise and collaboration.</li><li>Know When to Seek Help Involve a neutral third party if conflict resolution efforts stall or if emotions escalate.</li><li>Develop Preventative StrategiesImplement measures to prevent similar conflicts in the future through clear communication, established protocols, and conflict resolution training.</li></ul>","mode":"scrolling"}'::jsonb,
  14,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '15151f19-10fc-46f6-a3a9-d3a80a494c07',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Prompt:</strong> Drag to reveal the content</p><p>Effective Strategies on How to Identify and Manage Difficult Audience Members</p><p>How To Manage: The Talker, The Interjector, The Debater, The Observer, and The Non-Engaged</p>","mode":"scrolling"}'::jsonb,
  15,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '67c7e76f-b3f1-4fdd-80f9-87f0ce84b0b1',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Prompt:</strong> Swipe up to see more</p>","mode":"scrolling"}'::jsonb,
  16,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'fd9858ed-31c5-45ff-b051-0853be782694',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is it important to seek to understand all sides of a conflict?","options":["To assert dominance over others.","To gather information and find common ground.","To avoid addressing the conflict altogether.","To know who is at fault."],"correct_answer":"To gather information and find common ground.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  17,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '02b3ecdd-b258-4731-8215-6d7a71504117',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Which strategy is recommended to handle the behavior of a frequent interrupter during a presentation?</p><p><strong>Prompt:</strong> Swipe to select an answer</p><ul><li>Thank them for their input and continue speaking without interruption.</li><li>Politely remind them of the expectation to note questions and comments for later discussion.</li><li>Engage them in a specific task unrelated to the presentation.</li><li>Ignore their interruptions and proceed with the presentation.</li></ul>","mode":"scrolling"}'::jsonb,
  18,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '2aa585ba-be4f-4b47-8c7b-11d14388bb11',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the recommended approach for encouraging participation from a silent audience member?","options":["Invite everyone to share their opinions and respond positively when they contribute.","Ask them direct questions and pressure them to respond.","Thank them for their attention and move on to other participants.","Criticize their lack of participation in front of the group to motivate them."],"correct_answer":"Invite everyone to share their opinions and respond positively when they contribute.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  19,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e44faac9-497f-4984-9321-2b42ffbd6ba1',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Cross-Cultural Communication</p><p><strong>Prompt:</strong> Scroll to see more</p><p>Sometimes you will encounter individuals from all walks of life, demographics, nationalities, and cultures. Therefore, it is important to be cognizant of subtle nuances in the way that individuals communicate. This section will provide you with strategies to employ when dealing with cross-cultural relationships and how to nurture them respectfully.</p><p>In this module you will:Learn effective strategies to facilitate cross-cultural discussions.</p>","mode":"scrolling"}'::jsonb,
  20,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'b81f71cb-9630-4ad1-8401-8c342d5fde50',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Prompt:</strong> Swipe up to see more</p><p>Strategies for Effective Cross-Cultural Communication</p>","mode":"scrolling"}'::jsonb,
  21,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'cf9a5c56-55d4-464a-adc1-a9500ba4ecc4',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is it important to challenge stereotypes when communicating with cross-cultural audiences?","options":["To reinforce cultural biases.","To make assumptions about individuals within cultural groups.","To recognize the uniqueness of individuals and avoid generalizations.","To ensure that we treat audiences as homogenous groups."],"correct_answer":"To recognize the uniqueness of individuals and avoid generalizations.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  22,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e5892f55-c813-4c59-9227-f79d1f7189ed',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is one strategy for maintaining fruitful relationships with partners from diverse cultural backgrounds?","options":["Adapting your communication style to accommodate cultural norms and preferences.","Using complex language and technical jargon.","Being inflexible in your communication approach.","Speaking quickly to ensure meetings end promptly."],"correct_answer":"Adapting your communication style to accommodate cultural norms and preferences.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  23,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f543295d-c182-4fc6-becd-86d44722a7b8',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> How can asking questions contribute to effective cross-cultural communication?</p><p><strong>Prompt:</strong> Swipe to select an answer</p><ul><li>By avoiding dialogue and maintaining assumptions.</li><li>By demonstrating genuine interest and clarifying misunderstandings.</li><li>By imposing your own cultural values on others.</li><li>To ensure that others have more opportunities to speak than you do.</li></ul>","mode":"scrolling"}'::jsonb,
  24,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '2620047e-880e-40ef-afc8-f32644fd7869',
  '3478bc6d-00ec-40b1-822f-9d3c1edc8f86',
  '52935bc1-3de2-4433-abe7-43eb1186bde0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> In Conclusion...</p><p><strong>Prompt:</strong> Scroll to see more</p><p>Mastering skills such as managing interpersonal conflict, dealing with difficult audiences, and cross-cultural communication will help members of patient advocacy groups communicate their vision and mission effectively.</p><p>Developing these skills will create a harmonious and productive work environment within the organization, fostering understanding, respect, and collaboration across diverse cultural backgrounds.</p>","mode":"scrolling"}'::jsonb,
  25,
  true,
  '{}',
  1
);

-- Lesson 5: Effective Team Communication
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'd409475e-86c9-4886-bce9-db99158b547a',
  '4d759125-3682-4698-83ae-8ba5a0e7630b',
  'e0926dbb-4645-4495-a938-ed22467ddb7e',
  'Effective Team Communication',
  5,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '5ec150e3-bb2c-4854-b5b0-20baaba45da2',
  'd409475e-86c9-4886-bce9-db99158b547a',
  'content',
  'Effective Team Communication',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a590f266-81c5-4d38-83af-21d3ae134858',
  'd409475e-86c9-4886-bce9-db99158b547a',
  '5ec150e3-bb2c-4854-b5b0-20baaba45da2',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Importance of Effective Team Communication</p><p>Effective team communication is essential for achieving common goals, fostering collaboration, and ensuring the delivery of high-quality services to patients. Clear and open communication among team members enhances efficiency, promotes innovation, and strengthens relationships within the organization. This lesson will explore the importance of team communication in patient advocacy organizations and provide strategies to improve communication among team members, along with utilizing digital tools for enhanced collaboration.</p><p>Why Effective Team Communication is NecessaryFacilitates collaboration and teamwork in achieving common goals. Enhances efficiency and promotes innovation, while minimizing error. Improves patient care and advocacy outcomes by ensuring clear and consistent messaging.</p><p>Signs of Poor Team CommunicationMisunderstandings or confusion about tasks, goals, or expectations. Lack of engagement or participation in team meetings or discussions. Conflict or tension among team members. Duplication of efforts or missed deadlines due to communication breakdowns. Low morale or dissatisfaction among team members.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'be8c2745-c680-42ea-9dd3-a9dd2bb7a074',
  'd409475e-86c9-4886-bce9-db99158b547a',
  '5ec150e3-bb2c-4854-b5b0-20baaba45da2',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<ul><li>Strategies to Build a Culture of Openness, Transparency, and Inclusivity</li><li>Promote a culture of respect, transparency, and inclusivityEncourage communication and collaboration, promoting bottom-up communication where everyone''s voice is valued. Create an environment where team members feel safe to express their opinions, ideas, and concerns.</li><li>Address Concerns QuicklyAddress concerns, conflicts or disagreements among team members promptly and constructively. Encourage open dialogue and seek mutually beneficial solutions.</li><li>Encourage Engagement in MeetingsEnsure that team members feel empowered to contribute their ideas and perspectives. Acknowledge power dynamics within a meeting and create opportunities for everyone to participate.Encourage active listening, empathy, and professionalism among team members.</li><li>Provide Constructive FeedbackOffer both verbal and written feedback to team members on their performance. Remove blame from errors and mistakes, focusing instead on identifying root causes and implementing corrective actions. Focus on specific behaviors or actions and provide suggestions for improvement.</li></ul>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd40814bc-180f-4d84-b782-33c6096e747f',
  'd409475e-86c9-4886-bce9-db99158b547a',
  '5ec150e3-bb2c-4854-b5b0-20baaba45da2',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Digital Tools for Team Communication</p><p><strong>Prompt:</strong> Select each image for more details</p><ul><li>Project management platforms for task assignment and tracking (e.g. Notion, Trello)</li><li>Instant messaging apps for real time communication (e.g. Slack, Discord)</li><li>Video conferencing tools (e.g. Zoom, Microsoft Teams, Google Meet, Skype)</li><li>Document sharing for collaborative work (e.g. Microsoft One Drive, Google Drive, Dropbox)</li><li>Apps for scheduling appointments (e.g. When2Meet, Doodlepoll, LettuceMeet)</li></ul>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a81f216c-2dd1-4601-850a-b78e4fc0be8a',
  'd409475e-86c9-4886-bce9-db99158b547a',
  '5ec150e3-bb2c-4854-b5b0-20baaba45da2',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is it important for team leaders to hold regular meetings?","options":["To micromanage team members.","To discuss progress, challenges, and upcoming tasks.","To avoid communication with team members altogether."],"correct_answer":"To discuss progress, challenges, and upcoming tasks.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'b8c3c2bb-dffb-49b1-8770-cd65e96b86a1',
  'd409475e-86c9-4886-bce9-db99158b547a',
  '5ec150e3-bb2c-4854-b5b0-20baaba45da2',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Slide 6","options":["Promoting bottom-up communication and valuing everyone''s input.","Avoiding communication about sensitive topics.","Maintaining a hierarchical structure with limited communication channels."],"correct_answer":"Promoting bottom-up communication and valuing everyone''s input.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1b6a2699-1e32-442f-a71b-ad46bd991d1e',
  'd409475e-86c9-4886-bce9-db99158b547a',
  '5ec150e3-bb2c-4854-b5b0-20baaba45da2',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can team leaders effectively empower team members?","options":["By providing them with authority and autonomy to make decisions.","By micromanaging their tasks and decisions.","By restricting their access to information and resources."],"correct_answer":"By providing them with authority and autonomy to make decisions.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'cfe1d75d-05de-4908-8c97-1e3b52c98167',
  'd409475e-86c9-4886-bce9-db99158b547a',
  '5ec150e3-bb2c-4854-b5b0-20baaba45da2',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is a key aspect of building a culture of inclusivity?","options":["Embracing different perspectives and encouraging collaboration.","Focusing on individual achievements rather than teamwork.","Limiting growth and development opportunities to a select few.","Ignoring biases and discrimination in the workplace."],"correct_answer":"Embracing different perspectives and encouraging collaboration.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6c9fec25-8d26-402b-ad94-9b4d0c2b2259',
  'd409475e-86c9-4886-bce9-db99158b547a',
  '5ec150e3-bb2c-4854-b5b0-20baaba45da2',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> In Conclusion...</p><p><strong>Prompt:</strong> Scroll to see more</p><p>Effective team communication is crucial for patient advocacy organizations to achieve their goals.</p><p>By implementing streamlined strategies such as setting clear goals, holding regular meetings, fostering trust, resolving conflicts promptly, leading by example, creating safe communication spaces, encouraging engagement, celebrating success, providing feedback, sharing information effectively, and utilizing digital tools, teams can enhance collaboration, productivity, and ultimately, fulfill their mission of advocating for patients'' needs.</p>","mode":"scrolling"}'::jsonb,
  7,
  true,
  '{}',
  1
);

-- Lesson 6: Engaging with the Media
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  '4d759125-3682-4698-83ae-8ba5a0e7630b',
  'e0926dbb-4645-4495-a938-ed22467ddb7e',
  'Engaging with the Media',
  6,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'content',
  'Engaging with the Media',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '20fd1f21-9a51-4524-9c55-5aa398a1dc68',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Importance of Public Relations for Nonprofits</p><p>Importance of Public Relations for Nonprofits</p><p>Public relations is crucial for nonprofits to build awareness, credibility, and support for their cause.</p><p>Engaging with the media allows nonprofits to reach a wider audience and share their mission and impact.</p><p>Effective public relations can help nonprofits attract donors, volunteers, and partnerships.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '8af14ec6-3ca0-4872-8b5d-8a61b6c93f3d',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Building Media Relationships</p><ul><li>Nonprofits should research and identify media outlets that align with their cause and target audience.</li><li>Developing relationships with journalists and reporters can lead to increased media coverage and positive exposure.</li><li>Nonprofits should provide journalists with compelling stories, data, and visuals to capture their attention.</li></ul>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'af7381ec-ccb9-4747-ba80-b6942a5168e3',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Key Points for Creating a Media Pitch for a Non-Profit Organization</p><p><strong>Prompt:</strong> Select an item to see more</p><p><strong>Highlight Your Organization''s Background and Impact</strong></p><p>Your pitch should include information about your non-profit''s history, mission, and the key programs or initiatives you are involved in. Emphasize the impact your organization has made in the community or the issues it addresses.</p><p><strong>Customize the Pitch for Your Audience</strong></p><p>Adapt the language, tone, and visuals of your pitch to resonate with your target audience, whether they are potential donors, volunteers, or corporate partners. Use audience-specific messaging that showcases the relevance of your work to them.</p><p><strong>Showcase Specific Programs and Impact</strong></p><p>Focus on highlighting the specific programs or initiatives that are most relevant to the media outlet or journalist you are pitching. Provide concrete examples of the impact your non-profit has had in those areas.</p><p><strong>Incorporate Feedback and Personalization</strong></p><p>Gather feedback from stakeholders to continuously refine and personalize your pitch. Ensure that the visuals, design, and content reflect your organization''s brand and the local context or culture, if applicable</p><p><strong>Consider Creative and Interactive Pitch Formats</strong></p><p>To make your pitch stand out, consider incorporating creative elements like live demonstrations, interactive features, storytelling, or the use of emerging technologies like AR or VR. This can help engage the audience and convey your message in a memorable way.</p>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '28c4fd7c-a0ec-4638-976b-34b36f1a3223',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Key Points for Creating a Media Pitch for a Non-Profit Organization</p><p><strong>Prompt:</strong> Select an item to see more</p><p><strong>Emphasize Newsworthiness and Timeliness</strong></p><p>Ensure that the story or information you are pitching is genuinely newsworthy and timely. Highlight any recent developments, events, or initiatives that would be of interest to the media outlet and their audience.</p><p><strong>Personalize and Tailor the Pitch</strong></p><p>Research the media outlet and the specific journalist you are pitching to understand their interests, writing style, and the type of content they typically cover. Personalize your pitch accordingly to increase the chances of it being accepted.</p><p><strong>Provide Relevant Supporting Materials</strong></p><p>Offer additional resources like data, visuals, or a press release to supplement your pitch, but ensure that the pitch itself is concise and engaging. Make it easy for the journalist to access more information if they are interested.</p><p><strong>Follow Up and Track Engagement</strong></p><p>After sending your pitch, follow up with the journalist to gauge their interest and provide any additional information they may need. Track the engagement and response to your pitch to continuously improve your approach.</p>","mode":"scrolling"}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c6d99594-be36-4f08-9f6c-2aaa0028af37',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<ul><li>Press releases are formal announcements sent to the media to share news or updates about a nonprofit.</li><li>Media advisories are shorter documents that provide key details about upcoming events or opportunities for coverage.</li><li>Nonprofits should ensure their press releases and media advisories are well-written, concise, and include relevant contact information.</li></ul>","mode":"scrolling"}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '84fa348b-2f2b-4404-8417-e2e510a1dfec',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Media Interviews and Spokespersons</p><ol><li>Nonprofits may have opportunities for media interviews to share their expertise, impact, or respond to current events.</li><li>Designating a spokesperson who is knowledgeable, articulate, and passionate about the cause is essential for effective media interviews.</li><li>Spokespersons should be prepared with key messages and practice delivering them confidently.</li></ol>","mode":"scrolling"}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'df4031e2-050b-4b5e-be49-7f4ba8243107',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Monitoring and Evaluating Impact</p><p>Monitoring and Evaluating Impact</p><p>Nonprofits should establish metrics and goals to measure the impact of their public relations efforts.</p><p>Monitoring media coverage, website traffic, social media engagement, and donations can provide insights into the effectiveness of public relations strategies.</p><p>Regular evaluation and adjustment of strategies can help nonprofits improve their communication and achieve their goals.</p>","mode":"scrolling"}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd682161b-163b-4c78-9d82-2ea0a4f41760',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the purpose of engaging with the media for nonprofits?","options":["To reach a wider audience and share their mission and impact.","To generate revenue and increase funding opportunities.","To recruit volunteers and expand their workforce.","To establish partnerships with other nonprofit organizations."],"correct_answer":"To reach a wider audience and share their mission and impact.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '40105868-f748-472b-824b-e7aeb8d743bb',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What should nonprofits include in their media pitch?","options":["Impactful statistics, personal stories, and quotes.","Detailed financial information and budget breakdowns.","Lengthy descriptions of the organization''s history and background.","Technical jargon and industry-specific terminology."],"correct_answer":"Impactful statistics, personal stories, and quotes.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  8,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '2b3512e9-b6e3-43c1-8dcf-e10a506e0cc9',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Slide 11","options":["To share news or updates about the organization.","To request funding and donations from the public.","To recruit new board members and volunteers."],"correct_answer":"To share news or updates about the organization.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  9,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'dd86ae7a-ad9e-49b8-b444-b3cfbed2ac25',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> What is the role of a spokesperson in media interviews for nonprofits?</p><p><strong>Prompt:</strong> Swipe to select an answer</p><ul><li>To share expertise, impact, or respond to current events.</li><li>To criticize and challenge the media''s coverage of the organization.</li><li>To promote personal achievements and career milestones.</li><li>To divert attention from the organization''s mission and goals.</li></ul>","mode":"scrolling"}'::jsonb,
  10,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6059e91f-a47a-4415-9186-64c0e3e3832f',
  '5484e04b-d9ac-4b4e-b121-6d327f4c490c',
  'f36b9cf3-5972-412e-a26b-a89b74f21e91',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can nonprofits utilize social media platforms effectively?","options":["By engaging with their audience, sharing updates, and promoting their mission.","By exclusively focusing on fundraising and donation appeals.","By posting sporadically and inconsistently on social media.","By ignoring comments and messages from their audience."],"correct_answer":"By engaging with their audience, sharing updates, and promoting their mission.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  11,
  true,
  '{}',
  1
);

-- Lesson 7: Maximizing Impact in the Digital Age
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '4d759125-3682-4698-83ae-8ba5a0e7630b',
  'e0926dbb-4645-4495-a938-ed22467ddb7e',
  'Maximizing Impact in the Digital Age',
  7,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  'content',
  'Maximizing Impact in the Digital Age',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'b29e7fbd-eebb-4350-a88f-c75373370958',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Social Media and Online Presence</p><ul><li>Nonprofits should utilize social media platforms to engage with their audience, share updates, and promote their mission.</li><li>Creating compelling content, including stories, images, and videos, can help nonprofits stand out on social media.</li><li>Nonprofits should also monitor and respond to comments and messages on their social media platforms to maintain engagement.</li></ul>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '82e8f552-92a1-4a52-8c6a-be00a87284e8',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Developing a Social Media Schedule</p><p>Developing a Social Media Schedule</p><p>A social media schedule helps plan and organize content across different platforms.</p><p>It ensures consistent posting and engagement with the audience.</p><p>Key elements of a social media schedule include content themes, posting frequency, and timing.</p>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f79dfa0a-deb2-47ae-957c-476a99b7a394',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Effective Use of Websites and Blogs</p><ul><li>Websites and blogs are essential tools for digital marketing</li><li>They provide a platform to showcase products, services, and valuable content</li><li>Effective use involves optimizing design, navigation, and user experience</li><li>Regularly updating with fresh and relevant content helps attract and retain visitors</li></ul>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'b320a93e-3de8-4e89-9bd4-a237d29a0d68',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Creating a Targeted Message</p><p><strong>Prompt:</strong> Select an item to see more</p><p><strong>Tailored Message</strong></p><p>Identify your specific target audience groups (e.g. donors, volunteers, program participants).Craft key messages that resonate with each group''s interests, values, and language.</p><p><strong>Segment Communication Lists</strong></p><p>Create separate opt-in lists for different types of communications (e.g. general updates, events, advocacy).Only send relevant messages to each segmented list to improve engagement.</p><p><strong>Maintain Messaging Consistency</strong></p><p>Repeat key messages across all communications over time. Audiences need multiple exposures to internalize your brand and mission.</p><p><strong>Appeal on Multiple Levels</strong></p><p>Craft messages that inspire emotionally, inform intellectually, and provide clear calls-to-action.Combine emotional, tactical, and intellectual appeal.</p>","mode":"scrolling"}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'b98997bb-414c-40ee-a995-7d6e2b2c01e2',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Tips to Build an Email List</p><p><strong>Prompt:</strong> Select an item to see more</p><p><strong>Develop Compelling Lead Magnets</strong></p><p>Offer valuable incentives like ebooks, checklists, or exclusive content in exchange for an email signup.This gives people a reason to willingly provide their email address.</p><p><strong>Optimize Signup Forms</strong></p><p>Place signup forms strategically on your website, using clear and enticing call-to-actions. Test different form designs and placements to improve conversion rates.</p><p><strong>Leverage Social Media</strong></p><p>Promote your lead magnets and email signup forms across social media platforms. You can also use paid social ads to target specific audiences and drive more signups.</p><p><strong>Segment and Personalize</strong></p><p>Collect additional data like interests, preferences, and demographics when people sign up. This allows you to segment your list and send more personalized, relevant emails.</p><p><strong>Maintain List Hygiene</strong></p><p>Regularly clean your email list by removing inactive or invalid addresses. This keeps your list healthy and improves deliverability and engagement.</p>","mode":"scrolling"}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6a18d282-23d5-44df-9f13-8a2eacd5d2ea',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> How to Segment Email List</p><p><strong>Prompt:</strong> Select an item to see more</p><p><strong>Segment by Demographics</strong></p><p>Collect data on subscriber age, gender, location, and other basic demographics. Use this information to create targeted segments and tailor your messaging accordingly.</p><p><strong>Segment by Interests and Behaviors</strong></p><p>Track subscriber interests, purchase history, email engagement, and other behavioral data. Create segments based on this data to send more personalized and relevant content</p><p><strong>Continuously Maintain and Optimize Segments</strong></p><p>Regularly review and update your segments as subscriber data and preferences evolve. Test different segmentation strategies and measure the impact on engagement and conversions.</p>","mode":"scrolling"}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '9883da94-e62a-4fe0-bde2-a720160fb3c7',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> How to Create Compelling Content</p><p><strong>Prompt:</strong> Select an item to see more</p><p><strong>Write for Your Audience</strong></p><p>Understand your target audience''s interests, pain points, and language. Tailor your content to resonate with their needs and preferences.</p><p><strong>Provide Unique Value</strong></p><p>Don''t just regurgitate existing information. Offer a fresh perspective or cite new research.</p><p><strong>Maintain Consistent Tone and Voice</strong></p><p>Develop a distinct brand voice and writing style that aligns with your audience. Use this consistent tone across all your content to build recognition and trust.</p><p><strong>Focus on Clarity and Concision</strong></p><p>Avoid jargon, complex language, and unnecessary fluff. Get to the point quickly and communicate your message in a clear, easy-to-understand way.</p><p><strong>Leverage Multimedia Elements</strong></p><p>Incorporate visuals, videos, infographics, and other engaging formats. These multimedia components can make your content more memorable and shareable.</p><p><strong>Optimize for Discoverability</strong></p><p>Conduct keyword research to identify the terms your audience is searching for. Incorporate these keywords strategically throughout your content to improve search visibility.</p>","mode":"scrolling"}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '45eff3d8-b9b2-4419-aa62-1f9b4c82c093',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<ul><li>Leveraging Multimedia for Greater Impact</li><li>Multimedia includes images, videos, infographics, and interactive content</li><li>It helps capture attention, convey messages effectively, and increase engagement</li><li>Choosing the right multimedia formats based on the target audience is important</li><li>Integrating multimedia across digital platforms can amplify the impact of campaigns</li></ul>","mode":"scrolling"}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '65c6f9c1-75c3-4f60-96c8-9540a843dcf5',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What are the key elements of a social media schedule?","options":["Content themes, posting frequency, and timing","Target audience, engagement metrics, and analytics","Hashtags, emojis, and captions","Website design, navigation, and user experience"],"correct_answer":"Content themes, posting frequency, and timing","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  8,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a43df418-9b1f-4028-9479-efc66be787c3',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can websites and blogs be effectively used for digital marketing?","options":["Optimizing design, navigation, and user experience","Posting frequent updates and promotions","Utilizing social media influencers for endorsements","Implementing email marketing campaigns for lead generation"],"correct_answer":"Optimizing design, navigation, and user experience","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  9,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c0aeb0bb-21f6-4f12-b5b2-30b70f0b0a4a',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Slide 12","options":["Building an email list and segmenting it based on interests and demographics","Creating visually appealing email templates","Sending mass emails to all subscribers simultaneously"],"correct_answer":"Building an email list and segmenting it based on interests and demographics","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  10,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'bc1a53a4-6a91-476b-b201-0fce364edb0c',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> What does leveraging multimedia in digital campaigns help achieve?</p><p><strong>Prompt:</strong> Swipe to select an answer</p><ul><li>Capture attention, convey messages effectively, and increase engagement</li><li>Improve website loading speed and performance</li><li>Increase organic search engine rankings</li><li>Enhance social media follower count and likes</li></ul>","mode":"scrolling"}'::jsonb,
  11,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6d215ca0-84b9-435c-8a85-078a22833b96',
  'd103468b-6ac1-4cd3-9a0f-160996615ffe',
  '15d4d1b1-41f8-435b-8a5f-40c73cf3cecf',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the purpose of a social media schedule?","options":["Plan and organize content across different platforms","Track website traffic and conversion rates","Generate leads through paid advertising campaigns","Monitor competitor strategies and performance"],"correct_answer":"Plan and organize content across different platforms","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  12,
  true,
  '{}',
  1
);

-- Lesson 8: Feedback
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'a7546265-d76a-4d53-97c9-40ffad8b97a3',
  '4d759125-3682-4698-83ae-8ba5a0e7630b',
  'e0926dbb-4645-4495-a938-ed22467ddb7e',
  'Feedback',
  8,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '2bb8cb91-0411-49da-a9a1-6430fad4d183',
  'a7546265-d76a-4d53-97c9-40ffad8b97a3',
  'content',
  'Feedback',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '66a12297-9cad-48b8-9090-b3db98d1c25a',
  'a7546265-d76a-4d53-97c9-40ffad8b97a3',
  '2bb8cb91-0411-49da-a9a1-6430fad4d183',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> A title slide</p><p><strong>Subtitle:</strong> An optional subtitle</p><p>An optional subtitle</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- ──────────────────────────────────────────────────────────
-- Module 7: Development of Impactful Strategic Work Plans
-- ──────────────────────────────────────────────────────────

INSERT INTO courses (id, title, slug, description, institution_id, status, thumbnail_url, is_published, category_id)
VALUES (
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'Development of Impactful Strategic Work Plans',
  'development-of-impactful-strategic-work-plans',
  'Module 7 of the GANSID Capacity Building Curriculum.',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'published',
  NULL,
  true,
  NULL
);

INSERT INTO modules (id, course_id, institution_id, title, description, order_index, is_published)
VALUES (
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'Development of Impactful Strategic Work Plans',
  'Module 7: Development of Impactful Strategic Work Plans',
  0,
  true
);

-- Lesson 0: Introduction
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '6be236e2-d790-4c01-94e6-6c40bd017bd8',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'Introduction',
  0,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '4187b8ff-af34-4f77-9283-1ce858e9c95e',
  '6be236e2-d790-4c01-94e6-6c40bd017bd8',
  'content',
  'Introduction',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '9e5dfc9a-90e1-468c-b754-8a689d918189',
  '6be236e2-d790-4c01-94e6-6c40bd017bd8',
  '4187b8ff-af34-4f77-9283-1ce858e9c95e',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<h4>Introduction to the Development of Strategic Work Plans Module</h4><p>In this module, learners will grasp the essentials of strategic planning, focusing on developing concept notes and crafting work plans. This preparation equips patient advocacy organizations to effectively support their initiatives.</p><p>Author: Andrew Zapfel, MPH, PMPImage Credits: Canva</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 1: Disclaimer
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '0f2b52d8-b8a2-4b62-8054-6234afa6dd23',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'Disclaimer',
  1,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'bae4b6e6-877e-4f0d-bf70-10a888af624f',
  '0f2b52d8-b8a2-4b62-8054-6234afa6dd23',
  'content',
  'Disclaimer',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'ba07edee-94ba-4d1e-9575-57e37a2e5962',
  '0f2b52d8-b8a2-4b62-8054-6234afa6dd23',
  'bae4b6e6-877e-4f0d-bf70-10a888af624f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<h4>Disclaimer</h4><p>The Capacity Building Curriculum (\\"Curriculum\\") may be used strictly for educational, non- commercial purposes. By permitting such use The Global Action Network for Sickle Cell & Other Inherited Blood Disorders (GANSID) does not grant any broader license or waive any of its or any contributor''s rights under copyright or otherwise at law.This Curriculum has been developed as an educational tool for patient organizations and advocates. The GANSID assumes no liability for any inaccurate or incomplete information contained in this Curriculum, nor any actions taken in reliance thereon. You assume full responsibility for the use of any information provided. The information contained herein has been supplied by individual subject matter contributors without verification by us. The information is provided \\"AS IS\\" and GANSID assumes no obligation to update the information or advise on further developments concerning the topics mentioned. GANSID will not be responsible or liable in any way for the accuracy, relevancy, or copyright compliance of the material contained in this Curriculum. By viewing and using any information derived from the Curriculum, you hereby waive any claims, causes of action, and demands, whether in tort or contract, against GANSID (including its content creators, staff, directors, officers, and agents) and contributors, in any way related to use of the Curriculum or the information derived from it.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 2: Learning Objectives
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '10439d23-364f-4180-b0bf-4edc9d75060b',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'Learning Objectives',
  2,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'a42721d5-f5fa-4965-a931-b775b9a860a6',
  '10439d23-364f-4180-b0bf-4edc9d75060b',
  'content',
  'Learning Objectives',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '16692eea-e387-4f83-831b-2f7e9843c313',
  '10439d23-364f-4180-b0bf-4edc9d75060b',
  'a42721d5-f5fa-4965-a931-b775b9a860a6',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<h4>Learning Objectives</h4><ul><li>Understanding of the development of work plans, that include the specifics necessary to be successfully achieved.</li><li>Appreciating how to gain internal and external stakeholder buy-in and ongoing engagement to support work plan implementation.</li><li>How to measure success and articulate achieving work plan goals to internal and external stakeholders.</li></ul>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 3: Context
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'd2d9333e-6ecf-4a3b-83e1-7b0ded21e194',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'Context',
  3,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '7767fe29-7065-48af-91e6-cd3ec28e63aa',
  'd2d9333e-6ecf-4a3b-83e1-7b0ded21e194',
  'content',
  'Context',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a3289a63-f2cb-489b-b26a-0a0c9ab97d4d',
  'd2d9333e-6ecf-4a3b-83e1-7b0ded21e194',
  '7767fe29-7065-48af-91e6-cd3ec28e63aa',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<h4>Context to Developing Impactful Strategic Work Plans</h4><p>Strategic work plans are vital, especially for nonprofit organizations as it allows them to set up a blueprint for their project and stay organized. Work Plans also help to obtain approval or stakeholders as well as figuring out a timeline, budget and to ensure success.</p><p>Work plans are crucial for nonprofit organizations as it equips them with the ability to plan ahead, ensuring a smooth and well functioning event/program.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 4: The Work Plan Cycle
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'aefd0482-f1f2-4d56-b220-001a73c1e020',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'The Work Plan Cycle',
  4,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '9ccabdf5-6fa3-43b2-ace5-c1963e8cb98c',
  'aefd0482-f1f2-4d56-b220-001a73c1e020',
  'content',
  'The Work Plan Cycle',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '0c73359c-5a91-4d86-8d42-56bd44757195',
  'aefd0482-f1f2-4d56-b220-001a73c1e020',
  '9ccabdf5-6fa3-43b2-ace5-c1963e8cb98c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<h4>Work Plan Cycle</h4><p>There are 4 steps in the Work Plan Cycle: Concept Note Work Plan DevelopmentImplementation Evaluation Stakeholder engagement is crucial throughout this process.</p><h4>Learn about each step of the Work Plan Cycle!</h4><ul><li>Concept Note: An opening \\"idea\\" document to provide yourself and necessary stakeholders the framework of your plan. People who review the concept note will be able to provide input on how to develop this project and give initial support to your idea.</li><li>Work Plan Development: The detailed plan that will include how you will get from initial concept/idea to execution. This work plan should be very detailed and provide any user with a full understanding of the execution of your project and how you will measure success.</li><li>Work Plan Implementation: The steps you take to implement what was written and approved by stakeholders in your work plan. Monitoring implementation is critical to ensure you are achieving what you wanted to achieve and can express to stakeholders how you measure success.</li><li>Work Plan Evaluation: You should be monitoring your project''s success throughout implementation and be ready, as it comes to a closure, to showcase to stakeholders how well it went and what needs to be done in future projects to continue the work.</li></ul><h4>Stakeholder engagement is necessary throughout the Work Plan Cycle.</h4><p><strong>Internal Stakeholders</strong></p><p>Decision-makers, such as management: Ensure alignment with organizational goals and resource support. Project team members: Key to the project''s execution and collaboration, ensuring informed and motivated involvement</p><p><strong>External Stakeholders</strong></p><p>The community being served: Engaged to ensure the project meets their needs, builds trust, and remains relevant.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '0cfc1dc4-ca91-4ebc-9dc9-8f4384962b46',
  'aefd0482-f1f2-4d56-b220-001a73c1e020',
  '9ccabdf5-6fa3-43b2-ace5-c1963e8cb98c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"True","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f2b2effb-dfc1-4ba1-b6e1-5860ef4b57fd',
  'aefd0482-f1f2-4d56-b220-001a73c1e020',
  '9ccabdf5-6fa3-43b2-ace5-c1963e8cb98c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is work plan implementation?","options":["The detailed work plan outlines the process from concept to execution, enabling users to understand the project''s success measurement.","Executing the work plan is vital for achieving desired outcomes and communicating success to stakeholders. Monitoring ensures goals are met.","Monitoring project progress is crucial. As the project nears completion, prepare to present a comprehensive evaluation to stakeholders. Highlight achievements and outline steps for future projects to sustain and build upon this work."],"correct_answer":"Executing the work plan is vital for achieving desired outcomes and communicating success to stakeholders. Monitoring ensures goals are met.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6a6aed83-7683-4825-9c91-56772f22c569',
  'aefd0482-f1f2-4d56-b220-001a73c1e020',
  '9ccabdf5-6fa3-43b2-ace5-c1963e8cb98c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the is the work plan cycle in order?","options":["Concept note, work plan development, implementation, evaluation","Concept note, evaluation, work plan development, implementation","Recruitment, concept note, work plan development, implementation, evaluation","Concept note, work plan development, implementation"],"correct_answer":"Concept note, work plan development, implementation, evaluation","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

-- Lesson 5: Concept Note Development
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'db509fee-91cd-4328-a50a-7cdc5c0c9a50',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'Concept Note Development',
  5,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'e8d1b836-be0f-451b-9278-aa38dba3c78e',
  'db509fee-91cd-4328-a50a-7cdc5c0c9a50',
  'content',
  'Concept Note Development',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'bc665475-49d1-47c4-b0af-05816e4131e9',
  'db509fee-91cd-4328-a50a-7cdc5c0c9a50',
  'e8d1b836-be0f-451b-9278-aa38dba3c78e',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>The 4 Key Ingredients of an Effective Concept Note</p><h4>Example Concept NoteProject: Webinar Series on Mental Health</h4><p><strong>A:</strong> Background</p><p><strong>B:</strong> Many people with inherited blood disorders suffer from mental health issues due to the diagnosis, stigma around the disease, and the health and lifestyle challenges that come with managing the disease. Our members have noted that mental health is one of their top concerns but they lack understanding of how to address mental health challenges and where to go to seek services.</p><h4>Example Concept NoteProject: Webinar Series on Mental Health</h4><p><strong>A:</strong> Objective</p><p><strong>B:</strong> Host 2 webinars for the community on mental health including experts providing advice on where to seek care</p><h4>Example Concept NoteProject: Webinar Series on Mental Health</h4><p><strong>A:</strong> Rationale</p><p><strong>B:</strong> The organization will host the two webinars in November 2024 that will invite community members, experts, providers, and advocates to discuss mental health challenges and be provided with resources on where to seek care. The costs will be just for the Zoom link.</p><h4>Example Concept NoteProject: Webinar Series on Mental Health</h4><p><strong>A:</strong> Next Steps</p><p><strong>B:</strong> Seek stakeholder buy-in, schedule the sessions, and begin planning the agenda for the two webinars.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '542bf787-d229-4bf0-be56-c4533e0142f2',
  'db509fee-91cd-4328-a50a-7cdc5c0c9a50',
  'e8d1b836-be0f-451b-9278-aa38dba3c78e',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"True","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '59163f4d-62a2-4cf1-84b7-91d37f0f0398',
  'db509fee-91cd-4328-a50a-7cdc5c0c9a50',
  'e8d1b836-be0f-451b-9278-aa38dba3c78e',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

-- Lesson 6: Translating Your Concept Note to a Work Plan
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '7ae67436-3425-46b6-ad8c-7604bfb1138b',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'Translating Your Concept Note to a Work Plan',
  6,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'd7149238-4899-4f96-8539-d0206b893f56',
  '7ae67436-3425-46b6-ad8c-7604bfb1138b',
  'content',
  'Translating Your Concept Note to a Work Plan',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a96538a5-84b5-41b1-a70a-d67a15572df3',
  '7ae67436-3425-46b6-ad8c-7604bfb1138b',
  'd7149238-4899-4f96-8539-d0206b893f56',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>Strategy for Converting Your Concept Note into a Work Plan</p><p>Once stakeholders have approved your concept note, it''s time to develop your work plan. Follow these steps:</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'b4bbfe68-4ffc-47bf-8c54-1b2dd9759e98',
  '7ae67436-3425-46b6-ad8c-7604bfb1138b',
  'd7149238-4899-4f96-8539-d0206b893f56',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What should be worked on after the concept note has been approved?","options":["Work on work plan","Revise concept plan","Start buying supplies right away"],"correct_answer":"Work on work plan","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'ef50834d-c8c1-4e9c-9140-a3e44b4317d6',
  '7ae67436-3425-46b6-ad8c-7604bfb1138b',
  'd7149238-4899-4f96-8539-d0206b893f56',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"True","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

-- Lesson 7: Work Plan Objectives
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '1477629e-4e71-4c93-aaaf-b3ee33600a9e',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'Work Plan Objectives',
  7,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '6b927be0-ecae-4e52-88f1-175a21249570',
  '1477629e-4e71-4c93-aaaf-b3ee33600a9e',
  'content',
  'Work Plan Objectives',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '61922cff-20b4-4f26-8bdb-fd7a1427f9c0',
  '1477629e-4e71-4c93-aaaf-b3ee33600a9e',
  '6b927be0-ecae-4e52-88f1-175a21249570',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<h4>Work Plan Objectives</h4><p>The most important part of the work plan is your objectives.</p><p>Key aspects of your objectives: They provide the framework for all stakeholders on what you want to accomplish. They should be agreed upon by all stakeholders.They recognize the capacity of your organization.</p><p>Common Pitfalls</p><p>Here are some pitfalls that teams make when devising their objectives. Learn more about how to avoid them!</p><p>SMART-IE Objectives</p><p>S- Specific – Anyone can understand what is trying to be achieved.</p><p>M – Measurable – Can you see what success would look like?</p><p>A – Achievable – Does this objective match the capacity of your organization?</p><p>R – Realistic – Can this be done in the space/time you have set out for it?</p><p>T – Timebound – When do you see this objective being achieved?</p><p>Newer:</p><p>I – Inclusive – Does this objective serve the community?</p><p>E – Equitable – Are we insuring that the objective prioritizes equity in the community?</p><h4>Example SMARTIE Objective</h4><p>Initial Objective: We will raise awareness about Sickle Cell Disease in Kenya.</p><p>Make it more specific.</p><p>Revised Objective: We will conduct advocacy campaigns with policymakers on Sickle Cell Disease in Kenya.</p><p>Make it more measurable and timebound.</p><p>Final Version of Objective: We will conduct an advocacy campaign for policymakers for a new Ministry of Health Sickle Cell Disease strategy for Kenya, completed by 2025.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c9cebe38-9c09-4458-81f3-f54d81c6ef2c',
  '1477629e-4e71-4c93-aaaf-b3ee33600a9e',
  '6b927be0-ecae-4e52-88f1-175a21249570',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '42d30581-8c59-4075-ae64-115b47691f2d',
  '1477629e-4e71-4c93-aaaf-b3ee33600a9e',
  '6b927be0-ecae-4e52-88f1-175a21249570',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '59933c61-2646-4fea-8603-b130d4adecaa',
  '1477629e-4e71-4c93-aaaf-b3ee33600a9e',
  '6b927be0-ecae-4e52-88f1-175a21249570',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What does the ''A'' in SMART-IE means?","options":["Achievable","Analyzable","Acceptable","Admirable"],"correct_answer":"Achievable","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

-- Lesson 8: Logical Framework
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '24525d59-4e83-48fb-8ac0-f80d270c089a',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'Logical Framework',
  8,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '71e5e9c4-bb04-4844-9a93-6481150378d4',
  '24525d59-4e83-48fb-8ac0-f80d270c089a',
  'content',
  'Logical Framework',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c91fc537-d74a-4b52-92a3-e393df4d5626',
  '24525d59-4e83-48fb-8ac0-f80d270c089a',
  '71e5e9c4-bb04-4844-9a93-6481150378d4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<h4>Logical Framework</h4><p>The logical framework is an excellent tool to help project managers in: Confirming activities of the project Seeing ways you could measure success Developing the skeleton of the project proposal</p><p>The logical framework will help you in deciding best course of action, understanding risks, and appreciating what you may assume will be done to have a successful project.</p><ul><li>Definition: Resources that your organization brings to the project. Example: Budget, Personnel, Materials</li><li>Definition: Specific actions taken by your organization. Example: Conducting training workshops.</li><li>Definition: Tangible products or services produced as a result of activities. Example: Number of new clients signed.</li><li>Definition: Short to medium-term changes or benefits for stakeholders. Example: Improved knowledge and skills among staff members as a result of a training session.</li><li>Definition: Long-term changes or broader effects on the community or system. Example: Increased employment rates due to improved skills.</li></ul><p>Logical Framework Example: Community Health Fair</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '0bbba761-4f3c-4dd2-a35a-e7b85813ca71',
  '24525d59-4e83-48fb-8ac0-f80d270c089a',
  '71e5e9c4-bb04-4844-9a93-6481150378d4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the difference between a concept note and a work plan?","options":["A concept note is for getting stakeholders while a work plan is how this will be achieved","A work plan is for getting stakeholders while a concept note is how this will be achieved","They are the same."],"correct_answer":"A concept note is for getting stakeholders while a work plan is how this will be achieved","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'bb350bbe-a2a1-44e0-855b-4a7435e5357e',
  '24525d59-4e83-48fb-8ac0-f80d270c089a',
  '71e5e9c4-bb04-4844-9a93-6481150378d4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'adf92021-c460-494a-89ab-eb239b9de2ac',
  '24525d59-4e83-48fb-8ac0-f80d270c089a',
  '71e5e9c4-bb04-4844-9a93-6481150378d4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What are some of the parts of a logical framework?","options":["Inputs, activities, outputs, outcomes, impact","Only looks at the amount of participants and trainees","This is where you decide the reason of the activity"],"correct_answer":"Inputs, activities, outputs, outcomes, impact","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

-- Lesson 9: Budget, Timeline, and Ensuring Success
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'b3309818-40f1-4f0d-b436-4feb5f82d461',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'Budget, Timeline, and Ensuring Success',
  9,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '21ada0a1-1838-4d4c-a0b7-c08215cda622',
  'b3309818-40f1-4f0d-b436-4feb5f82d461',
  'content',
  'Budget, Timeline, and Ensuring Success',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '0bfd96ea-a531-4ccd-97dc-1d18599d9585',
  'b3309818-40f1-4f0d-b436-4feb5f82d461',
  '21ada0a1-1838-4d4c-a0b7-c08215cda622',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<h4>Budget, Timeline, Ensuring Success</h4><p>Before embarking on any project, it''s essential to reflect deeply on your budget and timeline. This ensures alignment with organizational goals and stakeholder expectations.</p><p>Budget Are you realistic about the costs? Do you have a breakdown of where the costs will go? Are the costs within donors'' expectations?</p><p>TimelineIs the timeline feasible for your organization?Are you rushing the process?Does your timeline reflect other competing priorities among your organization or stakeholders?Always ask: Is this feasible for my organization to do?</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '3efaab6c-c2a6-42d6-9fde-3d487745c083',
  'b3309818-40f1-4f0d-b436-4feb5f82d461',
  '21ada0a1-1838-4d4c-a0b7-c08215cda622',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1e2dc5cf-c5a0-435e-a1fc-ed5037498c8c',
  'b3309818-40f1-4f0d-b436-4feb5f82d461',
  '21ada0a1-1838-4d4c-a0b7-c08215cda622',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is most important?","options":["Having a budget, timeline and ensuring success","Making the most amount of money possible","Getting your project out as soon as possible"],"correct_answer":"Having a budget, timeline and ensuring success","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

-- Lesson 10: Measuring and Documenting Success
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'b8401889-7654-4665-a64f-03bbc1b18e30',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'Measuring and Documenting Success',
  10,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '2bd1ce18-9f38-47b6-b107-2193f844b7d7',
  'b8401889-7654-4665-a64f-03bbc1b18e30',
  'content',
  'Measuring and Documenting Success',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'ff6ecccb-b2c6-4561-8d20-dfa47d736cab',
  'b8401889-7654-4665-a64f-03bbc1b18e30',
  '2bd1ce18-9f38-47b6-b107-2193f844b7d7',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<h4>Measuring Success</h4><p>Define Success: Ask yourself, what does success look like? Define outputs, outcomes, and impact</p><h4>Documenting Success</h4><p>In your strategic plan, you must develop a specific plan for documenting success amongst your stakeholders.</p><p>Documenting is important for several reasons. Essential for accountability to yourself, your organization, donors, and the communities you serve Enhances communication and collaboration Knowledge management for future projects Compliance and legal reasons</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'cdc99449-6666-42ef-8dd0-bd05803c38fa',
  'b8401889-7654-4665-a64f-03bbc1b18e30',
  '2bd1ce18-9f38-47b6-b107-2193f844b7d7',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c4039171-6310-4d59-a536-b492a74407ff',
  'b8401889-7654-4665-a64f-03bbc1b18e30',
  '2bd1ce18-9f38-47b6-b107-2193f844b7d7',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is documenting important?","options":["Helps to ensure accountability, betters communication and collaboration, legal reasons","It is not important","It is only needed for donors to see success"],"correct_answer":"Helps to ensure accountability, betters communication and collaboration, legal reasons","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '787d8009-1bd7-4ed0-a146-5e0778968380',
  'b8401889-7654-4665-a64f-03bbc1b18e30',
  '2bd1ce18-9f38-47b6-b107-2193f844b7d7',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

-- Lesson 11: Conclusion
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '8fb08ed3-a392-45e9-8f34-0fac9fd13f86',
  '5f779fd0-2926-4bd7-a085-5959df2a5c74',
  'de35b96c-d99b-48a5-b0bb-85af2c34bbf9',
  'Conclusion',
  11,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'ea8052d7-28e0-4bcd-855c-e5834b45d76f',
  '8fb08ed3-a392-45e9-8f34-0fac9fd13f86',
  'content',
  'Conclusion',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '73909305-35d8-4e6c-996e-c264b5edd975',
  '8fb08ed3-a392-45e9-8f34-0fac9fd13f86',
  'ea8052d7-28e0-4bcd-855c-e5834b45d76f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<h4>Conclusion</h4><p>Strategic Planning:From Concept Note to Work Plan, it is important that you document how you will achieve success, what the objectives are to focus your efforts, and how it is feasible for your organization to do this.Stay away from offering too much or trying to achieve things far outside your scope.Remember, the concept note is meant to get stakeholders to agree to a project and the work plan is how you will achieve it.Take the time to plan for how you will measure for success. The more you document, the stronger your organization will become!</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- ──────────────────────────────────────────────────────────
-- Module 8: Grant Writing
-- ──────────────────────────────────────────────────────────

INSERT INTO courses (id, title, slug, description, institution_id, status, thumbnail_url, is_published, category_id)
VALUES (
  'd4657dcc-be32-489e-aed3-d8e4297a8a65',
  'Grant Writing',
  'grant-writing',
  'Module 8 of the GANSID Capacity Building Curriculum.',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'published',
  NULL,
  true,
  NULL
);

INSERT INTO modules (id, course_id, institution_id, title, description, order_index, is_published)
VALUES (
  '3b51fc09-0745-426f-82d4-2e3c265a5e63',
  'd4657dcc-be32-489e-aed3-d8e4297a8a65',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'Grant Writing',
  'Module 8: Grant Writing',
  0,
  true
);

-- Lesson 0: Introduction
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'b9bfaf42-7cf4-402b-b09a-ac07e09fdf8e',
  'd4657dcc-be32-489e-aed3-d8e4297a8a65',
  '3b51fc09-0745-426f-82d4-2e3c265a5e63',
  'Introduction',
  0,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '68d151e2-96e9-48e7-887a-fecc70844300',
  'b9bfaf42-7cf4-402b-b09a-ac07e09fdf8e',
  'content',
  'Introduction',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e2ce83c4-1654-439b-9603-231f96ab3245',
  'b9bfaf42-7cf4-402b-b09a-ac07e09fdf8e',
  '68d151e2-96e9-48e7-887a-fecc70844300',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>Effective grant proposals boost your chances of securing funds for daily operations and programs.In this module, learners will acquire the skills to effectively approach grant writing to ensure their organization''s sustainability and growth.</p><p>Author: Lanre Tunji-Ajayi M.S.MImage credits: Canva</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 1: Disclaimer
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'aeec1df9-0679-486d-b9d6-2cb80cc9502b',
  'd4657dcc-be32-489e-aed3-d8e4297a8a65',
  '3b51fc09-0745-426f-82d4-2e3c265a5e63',
  'Disclaimer',
  1,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '98d85f4e-03ac-446a-9d38-585cf5ed8d38',
  'aeec1df9-0679-486d-b9d6-2cb80cc9502b',
  'content',
  'Disclaimer',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'ef6402aa-6be0-4222-8218-2a9db57effd4',
  'aeec1df9-0679-486d-b9d6-2cb80cc9502b',
  '98d85f4e-03ac-446a-9d38-585cf5ed8d38',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>The Capacity Building Curriculum (\\"Curriculum\\") may be used strictly for educational, non-commercial purposes. By permitting such use The Global Action Network for Sickle Cell & Other Inherited Blood Disorders (GANSID) does not grant any broader license or waive any of its or any contributor''s rights under copyright or otherwise at law. This Curriculum has been developed as an educational tool for patient organizations and advocates. The GANSID assumes no liability for any inaccurate or incomplete information contained in this Curriculum, nor any actions taken in reliance thereon. You assume full responsibility for the use of any information provided. The information contained herein has been supplied by individual subject matter contributors without verification by us. The information is provided \\"AS IS\\" and GANSID assumes no obligation to update the information or advise on further developments concerning the topics mentioned. GANSID will not be responsible or liable in any way for the accuracy, relevancy, or copyright compliance of the material contained in this Curriculum. By viewing and using any information derived from the Curriculum, you hereby waive any claims, causes of action, and demands, whether in tort or contract, against GANSID (including its content creators, staff, directors, officers, and agents) and contributors, in any way related to use of the Curriculum or the information derived from it.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 2: Learning Objectives
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'c4ab8774-037b-4af4-866f-dab6970d8fdc',
  'd4657dcc-be32-489e-aed3-d8e4297a8a65',
  '3b51fc09-0745-426f-82d4-2e3c265a5e63',
  'Learning Objectives',
  2,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'bb22bcf4-c71d-483d-998c-8d6ac3b01ba3',
  'c4ab8774-037b-4af4-866f-dab6970d8fdc',
  'content',
  'Learning Objectives',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1919cd97-4078-429b-9cef-1052e4d6602c',
  'c4ab8774-037b-4af4-866f-dab6970d8fdc',
  'bb22bcf4-c71d-483d-998c-8d6ac3b01ba3',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<ul><li>Gain a clear understanding of what grant writing entails</li><li>Understand the different types of grants</li><li>Learn about the role of grants in securing funding</li><li>Understand the critical components of an effective grant proposal</li></ul>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 3: Context to Grant Writing
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '979ec42a-09e7-40e4-a8bf-e96d21428017',
  'd4657dcc-be32-489e-aed3-d8e4297a8a65',
  '3b51fc09-0745-426f-82d4-2e3c265a5e63',
  'Context to Grant Writing',
  3,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '757f06fb-4e5b-4fae-9625-c8000f2db134',
  '979ec42a-09e7-40e4-a8bf-e96d21428017',
  'content',
  'Context to Grant Writing',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'dc81c3bd-22fc-4a07-9dc6-6a93073eee94',
  '979ec42a-09e7-40e4-a8bf-e96d21428017',
  '757f06fb-4e5b-4fae-9625-c8000f2db134',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>As a patient advocacy organization, grant writing is a crucial skill to hone. Superb grant writing will elevate your chances of securing the funds needed to run your day-to-day operations and outreach programs.</p><p>Additionally, strong grant proposals can help build credibility with funders, foster long-term relationships, and open doors to new funding opportunities. By mastering this skill, you can ensure the sustainability and growth of your organization, enabling you to better serve your community.</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

-- Lesson 4: Grant Writing
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'd4657dcc-be32-489e-aed3-d8e4297a8a65',
  '3b51fc09-0745-426f-82d4-2e3c265a5e63',
  'Grant Writing',
  4,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'content',
  'Grant Writing',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f6796b9d-e2b7-426d-abc4-aa48f35f366d',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p>Grant writing is the process of applying for funding provided by a private, corporate, or government grant maker.</p><p>Grant seeking is highly competitive. It is especially difficult when requesting support for a new program or organization for the first time.There a several types of grants, including: Program and Project GrantsGeneral Operating GrantsCapital GrantsCapacity Building, and Endowment Grants</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '0cf67fa6-b30d-4f8d-a0bf-3bc4d199f688',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Private Sector</strong></p><p>FoundationsTrustsCorporations</p><p><strong>Public Sector</strong></p><p>FederalProvincial/StateMunicipal/Local</p>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'af72a992-d815-4f41-8d5f-45e393e5e1f8',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>5 Types of Grants</strong></p><ul><li>Program and Project GrantsProjects and programs are different. Programs are ongoing, while projects are for a set time.In a project-specific proposal, the grant application is focused on a single need that, once addressed, will bring about a specific outcome to meet that one need.Make sure to tailor the application to what the funder is funding.Include a detailed and transparent budget with your application.</li><li>General Operating GrantsA stable source of funding to offset the cost of running an organization.Addresses urgent, developing, and day-to-day needs.Funders usually want to know that a nonprofit can deliver on the promises made within the grant narrative. This assurance may include evidence of a strong board, stable volunteers, strategic plan and workplan, and other infrastructure to support your nonprofit''s work.</li><li>Capital GrantsTime specific for capital projects (e.g over 1-2 years).Grant category offers funding for building construction; building renovation, refurbishing, or maintenance; or land purchases.Capital grants also support the purchase of large equipment such as furnishings or building materials.</li><li>Capacity Building GrantsCapacity building grants focus on the inner workings of the organization. This includes the running of the organization through operations and administrative tasks. Funding defrays costs connected to starting and growing an organization such as strategic planning, training, coaching, and professional development, and human resources.Capacity building grants for nonprofits build organizational effectiveness.</li><li>Endowment GrantEndowment fund are established to fund charitable and nonprofit institutions such as churches, hospitals, and universities.It is an investment portfolio with the initial capital deriving from donations and typically structured with intact principals and investment income available for use.Endowment funds consist of cash, equities, bonds, and other types of securities that can generate investment income.</li></ul>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'bb21ab3c-47c0-4284-a144-07d23876fd9b',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<ul><li>Organizational History, Mission, and Impact</li><li>Identify the Gap: Know how your organization tends to fill this gap.</li><li>Organizational Documents: Financial Statements, Operating Budget, Incorporation Documents</li><li>Grant Maker: Know past, current, and prospective grant makers who could support your application</li><li>Alignment: Ensure a strong alignment between your needs and the grant maker''s goals & strategies</li><li>Disbursement plan: How you intend to use the funds</li><li>Reporting Plan to the funders and your board</li><li>Utilize worksheets to help you break down your thoughts and ideas</li></ul>","mode":"scrolling"}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1203cf71-9873-4713-9d9b-aef11ed75499',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>The Proposal: Effective Elements</strong></p><ul><li>Cover Letter/Executive SummaryBriefly introduce yourself, your organization, and your proposal with title of project including the gap the project aims fill to the grant maker.</li><li>Project PurposeClearly provide the aim/s of the project. The reason for its existence, or simply put, the ambition or dream pursued by the project.</li><li>ObjectivesThe measurable goals that the project will achieve. It could be tangible (e.g. assets or intangible, increased motivation). Most important, objectives must be attainable, time-bound & specific.</li><li>Budget Create a detailed budget covering expenses such as personnel, supplies, and overhead costs.</li><li>High-Level TacticsEstablish the strategies and methods that you will use to achieve the stated objectives and within budget.</li><li>MilestonesProvide step-by-step progress points of the project life and the expected timelines to achieve each milestone.</li><li>EvaluationProvide a plan of evaluation that will track if the project objectives/goals are being met throughout the entire timeline.</li><li>OutcomesOutcomes are the desired goals of the project (e.g, more families with SCD have improved disease management knowledge).</li><li>Project DeliverablesResults of project activities, i.e. what comes out of a project–the outputs that contributes to achieving outcomes (e.g project plans, reports, trainings) (e.g. 200 people will receive training).Project MeasurementTangible measures that will indicate success (e.g. 200 families will enroll in the disease management program; keeping within budget, finishing by timeline, etc.).</li></ul>","mode":"scrolling"}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '58e30e96-1113-4e60-92f1-9f7302d0bba8',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>The Close and the Win</strong></p><ul><li>The CloseMake a formal request for your award at the end of your proposal.Sign and submit the proposal in the name of the head of the organization.Clearly show all contact information.The grant writer''s name should not appear on the grant except if he/she is the head of the organization.Prepare for a report to the funders and your board as well as an audit (larger organizations).</li><li>The WinDetach award money (restricted use) from all other funds.Use the appropriate public relations.Thank the grant maker as appropriate.Keep your grant maker informed if changes to your project occur.</li></ul>","mode":"scrolling"}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '50b98841-c002-4d0f-8e87-86a77194dcf0',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<ul><li>When Your Grant Application is Rejected</li><li>Don''t Take it Personally. Meet with grant officer to find out what the application is missing.</li><li>Offer any additional information needed to change the prospect''s mind.</li><li>Keep the door open and look out for the next opportunity to submit your grant, bearing in mind why the first application failed.</li></ul>","mode":"scrolling"}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a49a2921-738c-4fec-a4e1-211fe208b057',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false? Projects help programs to achieve its aims","options":["True","False"],"correct_answer":"True","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'bd83a811-4766-4adb-b22f-8e6d89fe7e47',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false? Capital grants can also be used for operations","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  8,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '9f5fe9e9-a0ae-4eaa-9ff9-41df8342d103',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false? General operating grants are always restricted","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  9,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd6f730c7-b6a6-4880-a48a-1c8f8f770ffd',
  'f9baa134-7d3f-44c0-9100-2b4dc4b115e1',
  'e3e9c031-f5f3-40fe-9741-3e268eba7277',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false? Reporting after receiving funding is not very important","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  10,
  true,
  '{}',
  1
);

-- ──────────────────────────────────────────────────────────
-- Module 9: Leadership: What Works and What Does Not Work
-- ──────────────────────────────────────────────────────────

INSERT INTO courses (id, title, slug, description, institution_id, status, thumbnail_url, is_published, category_id)
VALUES (
  '2b746569-abd1-4b5f-805a-8015055f6e67',
  'Leadership: What Works and What Does Not Work',
  'leadership-what-works-and-what-does-not-work',
  'Module 9 of the GANSID Capacity Building Curriculum.',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'published',
  NULL,
  true,
  NULL
);

INSERT INTO modules (id, course_id, institution_id, title, description, order_index, is_published)
VALUES (
  '56e70ce5-f16b-4e1a-a658-a03c42fb0dd5',
  '2b746569-abd1-4b5f-805a-8015055f6e67',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'Leadership: What Works and What Does Not Work',
  'Module 9: Leadership: What Works and What Does Not Work',
  0,
  true
);

-- Lesson 0: Understanding Effective Leadership
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '2b746569-abd1-4b5f-805a-8015055f6e67',
  '56e70ce5-f16b-4e1a-a658-a03c42fb0dd5',
  'Understanding Effective Leadership',
  0,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  'content',
  'Understanding Effective Leadership',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e2c6b989-2b84-4d34-b7ac-11cbffb3a544',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Understanding Effective Leadership</p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '2e07f307-ca1a-46e6-8814-8dffb7a1bd6d',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> The Importance of Leadership</p><p><strong>Prompt:</strong> Scroll to see more</p><p>The Importance of Leadership</p><p>Leadership plays a crucial role in the success of any organization.</p><p>Effective leaders inspire and motivate their team members to achieve common goals.</p><p>Poor leadership can lead to confusion, low morale, and decreased productivity.</p>","mode":"scrolling"}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '7903b87c-8abe-479e-ad1f-f21184513ddc',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Qualities of Effective Leaders</p><ul><li>Effective leaders possess qualities such as good communication skills, empathy, and integrity.</li><li>They are able to listen to their team members and provide guidance and support.</li><li>They lead by example and are accountable for their actions.</li></ul>","mode":"scrolling"}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '1afcbb50-6e4b-47fc-ac2f-55d6539f95d4',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Leading by Example</p><p><strong>Prompt:</strong> Swipe to navigate</p><ul><li><strong>Leading by Example</strong></li><li>Leading by example means demonstrating the behaviors and values you expect from your team.</li><li>When leaders set a positive example, it encourages their team members to do the same.</li><li>This creates a culture of accountability and fosters trust within the organization.</li></ul>","mode":"scrolling"}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6e541b48-f3e6-4c32-9f71-5acb16dae319',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Communication Skills</p><p><strong>Prompt:</strong> Select each image for more details</p><ul><li>Communication Skills</li><li>Effective leaders are skilled communicators who can clearly convey their expectations and vision.</li><li>They actively listen to their team members and encourage open and honest communication.</li><li>Good communication helps to build strong relationships and resolve conflicts.</li></ul>","mode":"scrolling"}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'cfa58774-af21-464a-a538-02828d413bd0',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Adaptability and Flexibility</p><p><strong>Prompt:</strong> Read more</p><ol><li>Effective leaders are adaptable and flexible in their approach.</li><li>They can navigate through challenges and embrace change.</li><li>Being open to new ideas and perspectives allows leaders to make informed decisions.</li></ol>","mode":"scrolling"}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f17d4f3c-2004-48c9-bec8-03e0c7a585f5',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Empowering Others</p><ul><li>Effective leaders empower their team members by delegating tasks and giving them autonomy.</li><li>They trust their team''s abilities and provide opportunities for growth and development.</li><li>Empowering others fosters a sense of ownership and increases motivation.</li></ul>","mode":"scrolling"}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '73c56290-8b2d-45ef-aa58-fda56d6db6b6',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Emotional Intelligence</p><p><strong>Prompt:</strong> Scroll to see more</p><p>Emotional Intelligence</p><p>Emotional intelligence is the ability to understand and manage one''s own emotions and those of others.</p><p>Effective leaders with high emotional intelligence can empathize with their team members and build strong relationships.</p><p>They are aware of the impact their emotions have on others and can regulate their responses.</p>","mode":"scrolling"}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '3a9cd377-edcf-43d6-ba07-ad9d0fa4fe80',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>Title:</strong> Continuous Learning and Improvement</p><p><strong>Prompt:</strong> Read more</p><ol><li>Effective leaders are committed to continuous learning and self-improvement.</li><li>They seek out new knowledge, attend workshops, and read books to enhance their skills.</li><li>By continuously learning, leaders can stay updated with industry trends and adapt their strategies accordingly.</li></ol>","mode":"scrolling"}'::jsonb,
  8,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c135993a-4bdc-4feb-9170-9da3a99dc377',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the role of effective leadership in an organization?","options":["Inspiring and motivating team members to achieve common goals","Managing conflicts and resolving issues within the team","Ensuring compliance with company policies and procedures","Monitoring individual performance and providing feedback"],"correct_answer":"Inspiring and motivating team members to achieve common goals","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  9,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '0170bb77-179f-41ec-8bed-32207e66b99a',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What qualities do effective leaders possess?","options":["Good communication skills, empathy, and integrity","Technical expertise and knowledge in their field","Strong decision-making abilities and problem-solving skills","Extroverted personality and charisma"],"correct_answer":"Good communication skills, empathy, and integrity","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  10,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '60db0ef2-f9ab-4f64-b9f4-8430e246f75d',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Slide 12","options":["Demonstrating the behaviors and values expected from the team","Dictating tasks and micromanaging team members","Setting unrealistic goals and expectations for the team"],"correct_answer":"Demonstrating the behaviors and values expected from the team","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  11,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '3d732256-be39-493e-b017-f44315341721',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is a key aspect of effective communication for leaders?","options":["Actively listening to team members and encouraging open communication","Providing clear instructions and expectations to the team","Using persuasive techniques to influence team members'' opinions","Avoiding difficult conversations and conflicts within the team"],"correct_answer":"Actively listening to team members and encouraging open communication","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  12,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '2f8a0d0d-4129-45cb-96ba-37cc5b6bce35',
  '4ecdd9e3-53c7-4c94-b4d0-c78facf9af8d',
  '8b83f590-7ef7-4d6d-8341-256b2bc8f9c4',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is adaptability important for effective leaders?","options":["Navigating through challenges and embracing change","Maintaining a rigid and inflexible approach to leadership","Resisting change and sticking to traditional methods","Focusing solely on short-term goals and immediate results"],"correct_answer":"Navigating through challenges and embracing change","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  13,
  true,
  '{}',
  1
);

-- ──────────────────────────────────────────────────────────
-- Module 10: The Final Quiz — Patient Organizations' Capacity Building Training Program
-- ──────────────────────────────────────────────────────────

INSERT INTO courses (id, title, slug, description, institution_id, status, thumbnail_url, is_published, category_id)
VALUES (
  'f109c2ea-a204-42cf-9849-50676d3b9f44',
  $SQLDQ$The Final Quiz — Patient Organizations' Capacity Building Training Program$SQLDQ$,
  'final-quiz-capacity-building',
  'Module 10 of the GANSID Capacity Building Curriculum.',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'published',
  NULL,
  true,
  NULL
);

INSERT INTO modules (id, course_id, institution_id, title, description, order_index, is_published)
VALUES (
  '635d13e6-efa7-4551-9a94-3dd28aac9cde',
  'f109c2ea-a204-42cf-9849-50676d3b9f44',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  $SQLDQ$The Final Quiz — Patient Organizations' Capacity Building Training Program$SQLDQ$,
  $SQLDQ$Module 10: The Final Quiz — Patient Organizations' Capacity Building Training Program$SQLDQ$,
  0,
  true
);

-- Lesson 0: Recap Module 1: Fundamentals of Effective Advocacy
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '5114d085-7fe7-456b-9a79-4c23b8aac51e',
  'f109c2ea-a204-42cf-9849-50676d3b9f44',
  '635d13e6-efa7-4551-9a94-3dd28aac9cde',
  'Recap Module 1: Fundamentals of Effective Advocacy',
  0,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'ee890e86-e246-4632-9d7c-0e6f02a1aa84',
  '5114d085-7fe7-456b-9a79-4c23b8aac51e',
  'content',
  'Recap Module 1: Fundamentals of Effective Advocacy',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '00e1c96f-79ff-4246-99ed-31d1a2b0be42',
  '5114d085-7fe7-456b-9a79-4c23b8aac51e',
  'ee890e86-e246-4632-9d7c-0e6f02a1aa84',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which skill is essential for building alliances in advocacy work?","options":["Networking","Critical thinking","Decision making","Active listening"],"correct_answer":"Networking","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd879984b-684f-4c35-8154-b0e970f5f752',
  '5114d085-7fe7-456b-9a79-4c23b8aac51e',
  'ee890e86-e246-4632-9d7c-0e6f02a1aa84',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Who can be considered as people with lived disease experience?","options":["Individuals living with the disease, their caregivers, families, and advocates.","Healthcare professionals involved in treating the disease.","Researchers studying the disease.","Government officials responsible for disease control."],"correct_answer":"Individuals living with the disease, their caregivers, families, and advocates.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '28597094-3fd4-4d62-b13c-e686874da832',
  '5114d085-7fe7-456b-9a79-4c23b8aac51e',
  'ee890e86-e246-4632-9d7c-0e6f02a1aa84',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Where do patient organizations engage in advocacy efforts?","options":["Governments, hospital administrators and staff, workplaces, and schools.","Community centers and recreational facilities.","Religious institutions and charitable organizations.","Media outlets and social media platforms."],"correct_answer":"Governments, hospital administrators and staff, workplaces, and schools.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a7e86dea-d790-411c-8ddc-fdb5a2a58ef3',
  '5114d085-7fe7-456b-9a79-4c23b8aac51e',
  'ee890e86-e246-4632-9d7c-0e6f02a1aa84',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is one benefit of having people with lived disease experience in the governance of patient organizations?","options":["They bring a unique perspective and understanding of patient needs","They have extensive medical knowledge and expertise","They can provide financial support for healthcare initiatives","They have strong connections with pharmaceutical companies"],"correct_answer":"They bring a unique perspective and understanding of patient needs","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f4af661a-b1fa-456f-a630-1132f0eeccbd',
  '5114d085-7fe7-456b-9a79-4c23b8aac51e',
  'ee890e86-e246-4632-9d7c-0e6f02a1aa84',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the main focus of individual-driven advocacy?","options":["Empowering individuals to advocate for their own rights","Supporting organizations in advocating for policy change","Promoting community-driven initiatives for social change","Providing resources for collective advocacy efforts"],"correct_answer":"Empowering individuals to advocate for their own rights","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '91299b68-f720-43d1-b273-0c9befe3e75c',
  '5114d085-7fe7-456b-9a79-4c23b8aac51e',
  'ee890e86-e246-4632-9d7c-0e6f02a1aa84',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is one of the key skills required for effective advocacy?","options":["Strategic thinking","Time management","Problem-solving","Creativity"],"correct_answer":"Strategic thinking","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a76cf1df-6b22-4462-80fe-6ab6f24f6125',
  '5114d085-7fe7-456b-9a79-4c23b8aac51e',
  'ee890e86-e246-4632-9d7c-0e6f02a1aa84',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the main difference between advocacy and effective advocacy?","options":["Effective advocacy achieves tangible results.","Advocacy is focused on raising awareness only.","Effective advocacy is more expensive than regular advocacy.","Advocacy and effective advocacy have the same goals and outcomes."],"correct_answer":"Effective advocacy achieves tangible results.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  6,
  true,
  '{}',
  1
);

-- Lesson 1: Recap Module 2: Fundraising Strategies that Drive Results
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '78339ca5-fb42-403b-a890-1ec1591f8b11',
  'f109c2ea-a204-42cf-9849-50676d3b9f44',
  '635d13e6-efa7-4551-9a94-3dd28aac9cde',
  'Recap Module 2: Fundraising Strategies that Drive Results',
  1,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'd10725c3-8aee-4b85-86a9-c9c5ade74185',
  '78339ca5-fb42-403b-a890-1ec1591f8b11',
  'content',
  'Recap Module 2: Fundraising Strategies that Drive Results',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6f04ab74-5ab4-47e8-9821-af9fcc75ceb9',
  '78339ca5-fb42-403b-a890-1ec1591f8b11',
  'd10725c3-8aee-4b85-86a9-c9c5ade74185',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"True","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '45751090-b7e9-4fbc-8aba-4cc4a8035c4e',
  '78339ca5-fb42-403b-a890-1ec1591f8b11',
  'd10725c3-8aee-4b85-86a9-c9c5ade74185',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"True","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '5978e177-6890-4225-8c1d-e44c9205831d',
  '78339ca5-fb42-403b-a890-1ec1591f8b11',
  'd10725c3-8aee-4b85-86a9-c9c5ade74185',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"True","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

-- Lesson 2: Recap Module 3: Volunteer Management
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  'f109c2ea-a204-42cf-9849-50676d3b9f44',
  '635d13e6-efa7-4551-9a94-3dd28aac9cde',
  'Recap Module 3: Volunteer Management',
  2,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '38fcdf78-0264-482b-b962-ff07c7e3894c',
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  'content',
  'Recap Module 3: Volunteer Management',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '9cf3451a-9d1d-41d0-b9c0-2d1d44425162',
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  '38fcdf78-0264-482b-b962-ff07c7e3894c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What else is volunteer engagement referred to as:","options":["Volunteer management","Volunteer coordination","Volunteer administration","Volunteer sleuthing"],"correct_answer":"Volunteer management","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '8f365dce-715c-47a6-9767-4b328817ce7e',
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  '38fcdf78-0264-482b-b962-ff07c7e3894c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which of the following is NOT one of the four key activities in the recruitment phase?","options":["Training volunteers","Identifying your needs","Sourcing volunteers","Defining the application process"],"correct_answer":"Training volunteers","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'fbb30269-4141-45dc-a665-cc5342d8ccfb',
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  '38fcdf78-0264-482b-b962-ff07c7e3894c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is an effective way to provide orientation to new volunteers?","options":["Assign a mentor or partner, such as a senior volunteer or a leader","Have them start working immediately without any introduction","Give them a volunteer handbook and leave them to read it on their own.","Conduct a formal training session once a year"],"correct_answer":"Assign a mentor or partner, such as a senior volunteer or a leader","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'bf9f99f6-06b1-4db3-a461-937dff2326a8',
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  '38fcdf78-0264-482b-b962-ff07c7e3894c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Who is responsible for recognizing volunteers within an organization?","options":["Everyone in the organization","Only the volunteer manager","Only the organization''s CEO","Only the human resources department"],"correct_answer":"Everyone in the organization","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd482caad-e4dc-4b58-898c-0245a19b2e3f',
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  '38fcdf78-0264-482b-b962-ff07c7e3894c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is a key trend in volunteering that organizations should be aware of?","options":["Volunteers are increasingly seeking short-term involvement","Volunteers prefer long-term, indefinite commitments","Volunteers are less interested in organizational goals","Volunteers expect financial compensation"],"correct_answer":"Volunteers are increasingly seeking short-term involvement","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'dde4505c-602e-4897-929d-6fe1c041bc26',
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  '38fcdf78-0264-482b-b962-ff07c7e3894c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"When should an evaluation of a volunteer take place?","options":["At various times throughout their tenure, depending on their role","Only at the end of their volunteer tenure","Once a year, during the annual performance review","Only if there are issues with their performance"],"correct_answer":"At various times throughout their tenure, depending on their role","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'df13ccbd-300e-4c03-8420-b428ef5477c9',
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  '38fcdf78-0264-482b-b962-ff07c7e3894c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is it important to have an evaluation process for volunteers?","options":["To collect fees for their participation","To provide opportunities to give and receive information about their experience","To lengthen their volunteering period","To compare volunteers against each other"],"correct_answer":"To provide opportunities to give and receive information about their experience","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e26b54cd-c07c-4666-8ad6-ab8b1bccd7de',
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  '38fcdf78-0264-482b-b962-ff07c7e3894c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can mentorship serve as a component of stewardship?","options":["By providing formal training sessions to all volunteers","By transferring knowledge and wisdom through a structured or informal relationship","By conducting performance reviews for volunteers","By organizing large-scale volunteer events"],"correct_answer":"By transferring knowledge and wisdom through a structured or informal relationship","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '85b86f68-ee5b-49c6-9816-93c31eec5a4c',
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  '38fcdf78-0264-482b-b962-ff07c7e3894c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which of the following are examples of formal and informal volunteer recognition?","options":["Award ceremonies like Distinguished Volunteer Award ceremonies","Saying ''thank you'' at the completion of a task","Including volunteers in staff celebrations","Remembering volunteers’ start dates or birthdays","Formal medal ceremonies","Creating a formal recognition committee"],"correct_answer":"Award ceremonies like Distinguished Volunteer Award ceremonies","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  8,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '5ffadc8f-de58-4461-9bb4-8d05e380d898',
  'f96eb396-3255-4da1-a389-f513fddf1f92',
  '38fcdf78-0264-482b-b962-ff07c7e3894c',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which type of orientation focuses on helping the volunteer understand how their role fits into the larger context of the organization?","options":["System","Social","Operational","Position"],"correct_answer":"System","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  9,
  true,
  '{}',
  1
);

-- Lesson 3: Recap Module 4: Leadership
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '3aebb44c-3002-4e3f-ae68-c6cf6efb1cbb',
  'f109c2ea-a204-42cf-9849-50676d3b9f44',
  '635d13e6-efa7-4551-9a94-3dd28aac9cde',
  'Recap Module 4: Leadership',
  3,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'be46c3d5-7e9c-4f01-aa96-d674f78dcd12',
  '3aebb44c-3002-4e3f-ae68-c6cf6efb1cbb',
  'content',
  'Recap Module 4: Leadership',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '207e2a13-4c51-46e1-9fce-732b2e9880b7',
  '3aebb44c-3002-4e3f-ae68-c6cf6efb1cbb',
  'be46c3d5-7e9c-4f01-aa96-d674f78dcd12',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is a key characteristic of a visionary leader?","options":["They clearly communicate a compelling vision and motivate the team to achieve common goals.","They prefer to delegate tasks and avoid direct involvement.","They set challenging goals and maintain high standards.","They focus primarily on adhering to established processes and protocols."],"correct_answer":"They clearly communicate a compelling vision and motivate the team to achieve common goals.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a8854bed-3bdf-4928-865e-e090a2085317',
  '3aebb44c-3002-4e3f-ae68-c6cf6efb1cbb',
  'be46c3d5-7e9c-4f01-aa96-d674f78dcd12',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the impact of effective leadership on employee satisfaction and productivity?","options":["It improves employee satisfaction and productivity.","It has no impact on employee satisfaction and productivity.","It decreases employee satisfaction and productivity.","It only improves employee satisfaction but not productivity."],"correct_answer":"It improves employee satisfaction and productivity.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd0d54022-1159-4a69-a7a2-52a0bea57212',
  '3aebb44c-3002-4e3f-ae68-c6cf6efb1cbb',
  'be46c3d5-7e9c-4f01-aa96-d674f78dcd12',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the focus of transactional leadership?","options":["Setting clear expectations and providing rewards based on performance","Encouraging creativity and innovation","Encouraging creativity and innovation Prioritizing the needs of team members","Challenging the status quo and creating a vision"],"correct_answer":"Setting clear expectations and providing rewards based on performance","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '05572ce7-1346-4d96-a964-978b26869e72',
  '3aebb44c-3002-4e3f-ae68-c6cf6efb1cbb',
  'be46c3d5-7e9c-4f01-aa96-d674f78dcd12',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which of the following best describes the primary role of leadership in an organization?","options":["Ensuring that all tasks are completed on time","Guiding and influencing others towards a common vision or goal","Enforcing company policies and regulations strictly","Managing the financial aspects of the organization"],"correct_answer":"Guiding and influencing others towards a common vision or goal","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '33d331ce-0adf-4189-8a48-9831d8684847',
  '3aebb44c-3002-4e3f-ae68-c6cf6efb1cbb',
  'be46c3d5-7e9c-4f01-aa96-d674f78dcd12',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is effective leadership crucial for the success of an organization?","options":["It ensures that the organization''s financial resources are managed efficiently.","It focuses solely on the production and sales targets of the organization.","It inspires and motivates the team, encourages collaboration, and impacts overall performance.","It enforces strict compliance with organizational rules and regulations."],"correct_answer":"It inspires and motivates the team, encourages collaboration, and impacts overall performance.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

-- Lesson 4: Recap Module 5: Project Management
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '5a4fb917-d142-4509-a075-86e6cab7486d',
  'f109c2ea-a204-42cf-9849-50676d3b9f44',
  '635d13e6-efa7-4551-9a94-3dd28aac9cde',
  'Recap Module 5: Project Management',
  4,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'dc75b65d-372a-4bd8-a78d-e3bb7e083d20',
  '5a4fb917-d142-4509-a075-86e6cab7486d',
  'content',
  'Recap Module 5: Project Management',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '95a10d82-fb36-43b3-a8af-6a01bc9f983c',
  '5a4fb917-d142-4509-a075-86e6cab7486d',
  'dc75b65d-372a-4bd8-a78d-e3bb7e083d20',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the purpose of the Monitoring and Controlling Phase in project management?","options":["Track project performance and address variances from the plan","Define project scope and requirements","Implement the project plan by executing tasks and activities","Complete project deliverables and obtain formal acceptance"],"correct_answer":"Track project performance and address variances from the plan","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '125682f9-1775-4735-81fd-4342deee00a0',
  '5a4fb917-d142-4509-a075-86e6cab7486d',
  'dc75b65d-372a-4bd8-a78d-e3bb7e083d20',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the purpose of the RACI matrix in project management?","options":["To clarify roles and responsibilities for tasks or decisions","To track project progress and make adjustments as needed","To handle unexpected problems and find creative solutions","To communicate effectively with the project team and foster a positive working environment"],"correct_answer":"To clarify roles and responsibilities for tasks or decisions","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '9ec68084-a183-4ae0-ba4a-4fd4e8bb6b75',
  '5a4fb917-d142-4509-a075-86e6cab7486d',
  'dc75b65d-372a-4bd8-a78d-e3bb7e083d20',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the purpose of conducting a needs assessment in healthcare projects?","options":["To identify specific needs, preferences, and challenges faced by individuals, families, or communities","To analyze demographic data and community health indicators","To establish clear and measurable objectives for the project","To involve individuals, groups, or organizations with a vested interest in the project"],"correct_answer":"To identify specific needs, preferences, and challenges faced by individuals, families, or communities","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '340e1bb0-874c-4795-a1bf-ebb6dc2e2117',
  '5a4fb917-d142-4509-a075-86e6cab7486d',
  'dc75b65d-372a-4bd8-a78d-e3bb7e083d20',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can an implementation plan contribute to the success of a healthcare project?","options":["By outlining specific activities, timelines, and responsibilities required to achieve project objectives","By involving individuals, groups, or organizations with a vested interest or influence","By establishing clear and measurable objectives for the project","By assessing resource needs and constraints"],"correct_answer":"By outlining specific activities, timelines, and responsibilities required to achieve project objectives","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '7434669b-b15e-4a62-a5e4-474bac67fa91',
  '5a4fb917-d142-4509-a075-86e6cab7486d',
  'dc75b65d-372a-4bd8-a78d-e3bb7e083d20',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can stakeholder engagement contribute to the success of a healthcare project?","options":["By involving individuals, groups, or organizations with a vested interest or influence","By conducting surveys, interviews, or focus groups","By establishing clear and measurable objectives for the project","By assessing resource needs and constraints"],"correct_answer":"By involving individuals, groups, or organizations with a vested interest or influence","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '2d5e9e0b-1d54-4243-862d-b5a820cf7e7f',
  '5a4fb917-d142-4509-a075-86e6cab7486d',
  'dc75b65d-372a-4bd8-a78d-e3bb7e083d20',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which phase of project management involves coordinating tasks and assigning roles to team members?","options":["Putting Plans into Action","Understanding the Basics","Planning Like a Pro","Reflecting and Improving"],"correct_answer":"Putting Plans into Action","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'fe004094-1d1c-43a2-902a-792e612a38d5',
  '5a4fb917-d142-4509-a075-86e6cab7486d',
  'dc75b65d-372a-4bd8-a78d-e3bb7e083d20',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the main goal of the Planning Phase in project management?","options":["Define project scope, deliverables, and requirements","Implement the project plan by executing tasks and activities","Track project performance and address variances from the plan","Complete all project deliverables and obtain formal acceptance"],"correct_answer":"Define project scope, deliverables, and requirements","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c167c05f-dc4a-48f0-b926-d154cc583f5b',
  '5a4fb917-d142-4509-a075-86e6cab7486d',
  'dc75b65d-372a-4bd8-a78d-e3bb7e083d20',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Which phase of project management involves identifying stakeholders and establishing communication channels?","options":["Initiation Phase","Planning Phase","Execution Phase","Closing Phase"],"correct_answer":"Initiation Phase","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  7,
  true,
  '{}',
  1
);

-- Lesson 5: Recap Module 6: Effective Communication
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  'f109c2ea-a204-42cf-9849-50676d3b9f44',
  '635d13e6-efa7-4551-9a94-3dd28aac9cde',
  'Recap Module 6: Effective Communication',
  5,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  'content',
  'Recap Module 6: Effective Communication',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '39f027a3-de4e-4bcc-94da-cac7ef2536ae',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is it important to tailor your message to your audience?","options":["To impress the audience with your knowledge.","To ensure that your message resonates with the audience and meets their needs.","To demonstrate your authority as a speaker.","To confuse the audience with complex language."],"correct_answer":"To ensure that your message resonates with the audience and meets their needs.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '314f3c44-d342-472b-9d35-290e1a86474f',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is it important to seek to understand all sides of a conflict?","options":["To assert dominance over others.","To gather information and find common ground.","To avoid addressing the conflict altogether.","To know who is at fault."],"correct_answer":"To gather information and find common ground.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '7d540d90-73c8-4256-ae1b-ea608c3aac91',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is it important to challenge stereotypes when communicating with cross-cultural audiences?","options":["To reinforce cultural biases.","To make assumptions about individuals within cultural groups.","To recognize the uniqueness of individuals and avoid generalizations.","To ensure that we treat audiences as homogenous groups."],"correct_answer":"To recognize the uniqueness of individuals and avoid generalizations.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '2649c0bd-0855-42ae-9baf-7df3e5b82687',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is it important for team leaders to hold regular meetings?","options":["To micromanage team members.","To discuss progress, challenges, and upcoming tasks.","To avoid communication with team members altogether."],"correct_answer":"To discuss progress, challenges, and upcoming tasks.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f22138b3-662c-49e4-a6d1-70204a0395eb',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the purpose of engaging with the media for nonprofits?","options":["To reach a wider audience and share their mission and impact.","To generate revenue and increase funding opportunities.","To recruit volunteers and expand their workforce.","To establish partnerships with other nonprofit organizations."],"correct_answer":"To reach a wider audience and share their mission and impact.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6b53a1e2-4524-49ec-a1a8-d1958859a112',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What are the key elements of a social media schedule?","options":["Content themes, posting frequency, and timing","Target audience, engagement metrics, and analytics","Hashtags, emojis, and captions","Website design, navigation, and user experience"],"correct_answer":"Content themes, posting frequency, and timing","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '342c6d3f-dcff-4907-926f-c0731096b3a8',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can websites and blogs be effectively used for digital marketing?","options":["Optimizing design, navigation, and user experience","Posting frequent updates and promotions","Utilizing social media influencers for endorsements","Implementing email marketing campaigns for lead generation"],"correct_answer":"Optimizing design, navigation, and user experience","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'e4e85974-9e48-44d6-a765-e79b5e121b3e',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the purpose of a social media schedule?","options":["Plan and organize content across different platforms","Track website traffic and conversion rates","Generate leads through paid advertising campaigns","Monitor competitor strategies and performance"],"correct_answer":"Plan and organize content across different platforms","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'dde008b9-276c-4165-a029-b2cb66c02f13',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What should nonprofits include in their media pitch?","options":["Impactful statistics, personal stories, and quotes.","Detailed financial information and budget breakdowns.","Lengthy descriptions of the organization''s history and background.","Technical jargon and industry-specific terminology."],"correct_answer":"Impactful statistics, personal stories, and quotes.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  8,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'eef8fc81-0aeb-4233-a0fe-0314aa08b3d6',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can nonprofits utilize social media platforms effectively?","options":["By engaging with their audience, sharing updates, and promoting their mission.","By exclusively focusing on fundraising and donation appeals.","By posting sporadically and inconsistently on social media.","By ignoring comments and messages from their audience."],"correct_answer":"By engaging with their audience, sharing updates, and promoting their mission.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  9,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6898df08-0da3-4265-94ea-0447404c9901',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can team leaders effectively empower team members?","options":["By providing them with authority and autonomy to make decisions.","By micromanaging their tasks and decisions.","By restricting their access to information and resources."],"correct_answer":"By providing them with authority and autonomy to make decisions.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  10,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '8c57b293-fe0b-4e4c-8d9e-94a914aa5765',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is a key aspect of building a culture of inclusivity?","options":["Embracing different perspectives and encouraging collaboration.","Focusing on individual achievements rather than teamwork.","Limiting growth and development opportunities to a select few.","Ignoring biases and discrimination in the workplace."],"correct_answer":"Embracing different perspectives and encouraging collaboration.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  11,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'abe44736-8f39-4903-bcb5-a730ec6b2fc2',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is one strategy for maintaining fruitful relationships with partners from diverse cultural backgrounds?","options":["Adapting your communication style to accommodate cultural norms and preferences.","Using complex language and technical jargon.","Being inflexible in your communication approach.","Speaking quickly to ensure meetings end promptly."],"correct_answer":"Adapting your communication style to accommodate cultural norms and preferences.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  12,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'a379e794-72d2-4440-b281-0ba632da9346',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the recommended approach for encouraging participation from a silent audience member?","options":["Invite everyone to share their opinions and respond positively when they contribute.","Ask them direct questions and pressure them to respond.","Thank them for their attention and move on to other participants.","Criticize their lack of participation in front of the group to motivate them."],"correct_answer":"Invite everyone to share their opinions and respond positively when they contribute.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  13,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '5a73ab8c-d065-4f29-b4c0-a505e1450b85',
  '250547ef-62b9-4b99-bedd-7dfd39e5497e',
  '79e320eb-013f-47f2-adac-0dd925798ef0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"How can nonverbal communication enhance the effectiveness of your speech?","options":["By conveying confidence, sincerity, and engagement.","By distracting the audience from the main message.","By using filler words to fill pauses in speech.","By speaking in a monotone voice to maintain neutrality."],"correct_answer":"By conveying confidence, sincerity, and engagement.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  14,
  true,
  '{}',
  1
);

-- Lesson 6: Recap Module 7: Development of Impactful Strategic Work Plans
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  'f109c2ea-a204-42cf-9849-50676d3b9f44',
  '635d13e6-efa7-4551-9a94-3dd28aac9cde',
  'Recap Module 7: Development of Impactful Strategic Work Plans',
  6,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  'content',
  'Recap Module 7: Development of Impactful Strategic Work Plans',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'dc2afaa6-1c5d-4ef1-a74e-6788e4d1113e',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"True","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6ff903e6-9113-445c-b180-55b60b791b61',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"True","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '7a995901-274a-4c8a-80f5-eb7ca57372df',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '12fc3d0c-b7d0-4cc5-bdb0-770e63d544d3',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is work plan implementation?","options":["The detailed work plan outlines the process from concept to execution, enabling users to understand the project''s success measurement.","Executing the work plan is vital for achieving desired outcomes and communicating success to stakeholders. Monitoring ensures goals are met.","Monitoring project progress is crucial. As the project nears completion, prepare to present a comprehensive evaluation to stakeholders. Highlight achievements and outline steps for future projects to sustain and build upon this work."],"correct_answer":"Executing the work plan is vital for achieving desired outcomes and communicating success to stakeholders. Monitoring ensures goals are met.","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '7d2baf98-f875-4cd9-b015-26a11accf84f',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the is the work plan cycle in order?","options":["Concept note, work plan development, implementation, evaluation","Concept note, evaluation, work plan development, implementation","Recruitment, concept note, work plan development, implementation, evaluation","Concept note, work plan development, implementation"],"correct_answer":"Concept note, work plan development, implementation, evaluation","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  4,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '408c2c01-28d0-4a0e-b2c6-432f99e9c582',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What should be worked on after the concept note has been approved?","options":["Work on work plan","Revise concept plan","Start buying supplies right away"],"correct_answer":"Work on work plan","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  5,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'dc18f548-9e32-45a9-b61e-338897839c09',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is the difference between a concept note and a work plan?","options":["A concept note is for getting stakeholders while a work plan is how this will be achieved","A work plan is for getting stakeholders while a concept note is how this will be achieved","They are the same."],"correct_answer":"A concept note is for getting stakeholders while a work plan is how this will be achieved","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  6,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '78fd5ab4-35fa-4efb-b900-77daa6e41f09',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  7,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '845bad10-e1cf-4922-99db-0ddfdddad9d3',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  8,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '6cfddc40-a894-4a12-ba99-7a086403aa35',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What is most important?","options":["Having a budget, timeline and ensuring success","Making the most amount of money possible","Getting your project out as soon as possible"],"correct_answer":"Having a budget, timeline and ensuring success","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  9,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd2692ab3-4d60-4f33-9330-9cf725611b7c',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  10,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'd8e4def4-03a6-4afe-9bed-5dee1a139c5e',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What are some of the parts of a logical framework?","options":["Inputs, activities, outputs, outcomes, impact","Only looks at the amount of participants and trainees","This is where you decide the reason of the activity"],"correct_answer":"Inputs, activities, outputs, outcomes, impact","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  11,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'c29ca17e-f5b4-412f-8e00-0bc811a294d4',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Why is documenting important?","options":["Helps to ensure accountability, betters communication and collaboration, legal reasons","It is not important","It is only needed for donors to see success"],"correct_answer":"Helps to ensure accountability, betters communication and collaboration, legal reasons","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  12,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'f8b6559d-180b-45a0-8ca2-9614f073cfd4',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  13,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '754de8f0-bda9-4305-9224-559f98aacfc3',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"What does the ''A'' in SMART-IE means?","options":["Achievable","Analyzable","Acceptable","Admirable"],"correct_answer":"Achievable","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  14,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '76a370a6-f9ff-49d2-a404-0fbf509ab278',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"True","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  15,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '28350d98-e1fd-46c4-8504-553f23950264',
  '1dddf027-178a-4cce-a616-a764ee1646aa',
  '41472db2-5b29-473f-bced-aa01cdc7c828',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  16,
  true,
  '{}',
  1
);

-- Lesson 7: Recap Module 8: Grant Writing
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  'f43c7479-a046-4710-8042-cb5f9fd201cc',
  'f109c2ea-a204-42cf-9849-50676d3b9f44',
  '635d13e6-efa7-4551-9a94-3dd28aac9cde',
  'Recap Module 8: Grant Writing',
  7,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  '75908616-7aa7-4b48-a392-14af5d8b055f',
  'f43c7479-a046-4710-8042-cb5f9fd201cc',
  'content',
  'Recap Module 8: Grant Writing',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'dcd740c9-c844-40d5-9fe0-5e325b5c6440',
  'f43c7479-a046-4710-8042-cb5f9fd201cc',
  '75908616-7aa7-4b48-a392-14af5d8b055f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"True","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  0,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '068fc1ae-c5d4-42f5-9034-139751d328f6',
  'f43c7479-a046-4710-8042-cb5f9fd201cc',
  '75908616-7aa7-4b48-a392-14af5d8b055f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  1,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'cf80fd22-03ae-4af2-80c2-17ea21743110',
  'f43c7479-a046-4710-8042-cb5f9fd201cc',
  '75908616-7aa7-4b48-a392-14af5d8b055f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  2,
  true,
  '{}',
  1
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  '14ddebd4-3904-4b2f-9dcd-0d0af8177164',
  'f43c7479-a046-4710-8042-cb5f9fd201cc',
  '75908616-7aa7-4b48-a392-14af5d8b055f',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'quiz_inline',
  '{"question":"Is the following statement true or false?","options":["True","False"],"correct_answer":"False","question_type":"multiple_choice","show_feedback":true}'::jsonb,
  3,
  true,
  '{}',
  1
);

-- Lesson 8: Course Feedback
INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)
VALUES (
  '5a6dc560-821b-4681-9796-378339e9b7b8',
  'f109c2ea-a204-42cf-9849-50676d3b9f44',
  '635d13e6-efa7-4551-9a94-3dd28aac9cde',
  'Course Feedback',
  8,
  'blocks',
  true,
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a'
);

INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)
VALUES (
  'd42df66f-14c3-4cb7-a985-a04efe08c2c0',
  '5a6dc560-821b-4681-9796-378339e9b7b8',
  'content',
  'Course Feedback',
  0,
  'published',
  '{}'
);

INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)
VALUES (
  'be46a1d7-4ffb-4194-85a6-e77e07ab5dd6',
  '5a6dc560-821b-4681-9796-378339e9b7b8',
  'd42df66f-14c3-4cb7-a985-a04efe08c2c0',
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'rich_text',
  '{"html":"<p><strong>How likely are you to recommend the course content (e.g., relevance, clarity, and depth) to others?</strong></p><ul><li>Very Likely</li><li>Likely</li><li>Neutral</li><li>Unlikely</li><li>Very Unlikely</li></ul><p><strong>How likely are you to say the course helped you achieve your learning goals?</strong></p><ul><li>Very Likely</li><li>Likely</li><li>Neutral</li><li>Unlikely</li><li>Very Unlikely</li></ul><p><strong>How likely are you to say the course pace was manageable and allowed you to keep up with the material?</strong></p><ul><li>Very Likely</li><li>Likely</li><li>Neutral</li><li>Unlikely</li><li>Very Unlikely</li></ul><p><strong>How likely are you to say the course instructions and expectations were clear and easy to follow?</strong></p><ul><li>Very Likely</li><li>Likely</li><li>Neutral</li><li>Unlikely</li><li>Very Unlikely</li></ul><p><strong>How likely are you to use what you’ve learned from this course in real-world scenarios?</strong></p><ul><li>Very Likely</li><li>Likely</li><li>Neutral</li><li>Unlikely</li><li>Very Unlikely</li></ul><p><strong>What other topics would you want to learn about in future modules?</strong> <em>(free text response)</em></p><p><strong>Any other comments or feedback?</strong> <em>(free text response)</em></p>","mode":"scrolling"}'::jsonb,
  0,
  true,
  '{}',
  1
);

COMMIT;
