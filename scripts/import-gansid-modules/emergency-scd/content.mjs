/**
 * Authoring source for the "Emergency assessment and management of acute complications of
 * sickle cell disease" course (Dr. Jennifer Bryan deck). All clinical wording comes from the
 * deck's slides and narration. `img(name)` and clip numbers are resolved by build.mjs.
 *
 * clips: narration clip numbers from the deck. '48t'/'84t' are trimmed so a clip doesn't run
 * into the next topic.
 */
export const NAVY = '#1A3C6E', RED = '#DC2626', TEAL = '#0099CA';

export const COURSE = {
  slug: 'emergency-acute-complications-scd',
  title: 'Emergency assessment and management of acute complications of sickle cell disease',
  description: 'Seven narrated mini lessons from Dr. Jennifer Bryan on the emergency care of people living with sickle cell disease: acute pain, fever, stroke, acute chest syndrome, priapism and acute anemia, and the barriers that stand between patients and timely, high-quality care.',
  thumbnail: 'image34.jpg',
};

// ── block helpers ────────────────────────────────────────────────────────────
const p = (s) => `<p>${s}</p>`;
export const text = (html) => ({ t: 'rich_text', d: { html, mode: 'standard' } });
export const callout = (variant, title, html) => ({ t: 'callout', d: { mode: 'callout', variant, title, html } });
export const bubble = (txt, name, title, avatar, direction = 'left', style = 'accent') => ({ t: 'callout', d: { mode: 'speech_bubble', bubble_text: txt, author_name: name, author_title: title, ...(avatar ? { avatar_url: avatar } : {}), direction, bubble_style: style, avatar_style: 'circle' } });
export const list = (items, o = {}) => ({ t: 'content_list', d: {
  items: items.map((h) => ({ html: p(h) })), bullet_style: o.bullet || 'disc', bullet_color: o.color || RED,
  font_size: o.size || 'auto', enable_animations: o.animate !== false, animation_uniform: true,
  animation_direction: o.dir || 'left', animation_stagger_ms: 140, ...(o.heading ? { heading: o.heading } : {}),
  ...(o.media ? { media: { kind: 'image', url: o.media, alt: o.alt || '', size: o.mediaSize || 'md', fit: 'contain', rounded: true }, media_position: o.mediaPos || 'right' } : {}),
} });
export const accordion = (items, o = {}) => ({ t: 'content_list', d: {
  display_mode: 'accordion', items: items.map(([title, html]) => ({ title, html })), accordion_icon: o.icon || 'plus',
  accordion_multiple: !!o.multiple, accordion_default_open: o.open || 'first', accordion_accent_color: NAVY, enable_animations: true,
  ...(o.media ? { media: { kind: 'image', url: o.media, alt: o.alt || '', size: 'md', fit: 'contain', rounded: true }, media_position: 'right' } : {}),
} });
export const image = (url, alt, caption) => ({ t: 'image_gallery', d: { images: [{ url, alt, ...(caption ? { caption } : {}) }], mode: 'single', objectFit: 'contain', displaySize: 'lg' } });
export const reveal = (images, hint, req = true) => ({ t: 'image_gallery', d: { images, mode: 'gallery', gridLayout: 'sideBySide', columns: images.length >= 3 ? 3 : 2, objectFit: 'contain', aspectRatio: '4/3', clickForMore: true, clickHint: hint, markClicked: true, requireAllClicked: req, displaySize: 'sm', widthPreset: 'md' } });
export const hotspot = (url, alt, spots, prompt, color = RED) => ({ t: 'image_gallery', d: { images: [{ url, alt }], mode: 'hotspot', objectFit: 'contain', hotspots: spots.map(([x, y, label, title, body], i) => ({ id: `h${i + 1}`, x, y, label, title, body: p(body) })), showHotspotLabels: false, hotspotColor: color, hotspotPrompt: prompt } });
export const compareText = (l, r, prompt, caption) => ({ t: 'image_compare', d: { mode: 'text', before: { url: '', heading: l[0], text: l[1], bg_color: l[2] || NAVY, text_color: '#FFFFFF' }, after: { url: '', heading: r[0], text: r[1], bg_color: r[2] || '#F0F7FB', text_color: r[2] ? '#FFFFFF' : '#0F172A' }, initial_position: 94, aspect: '4/3', handle_style: 'arrows', show_labels: 'never', prompt, ...(caption ? { caption } : {}) } });
export const compareImg = (a, b, la, lb, prompt, caption) => ({ t: 'image_compare', d: { mode: 'image', before: { url: a, alt: la }, after: { url: b, alt: lb }, before_label: la, after_label: lb, initial_position: 50, aspect: '4/3', fit: 'cover', handle_style: 'arrows', show_labels: 'always', prompt, ...(caption ? { caption } : {}) } });
export const scratch = (cover, under, o = {}) => ({ t: 'scratch_reveal', d: { before: { type: 'text', text: cover, bg_color: o.coverBg || NAVY, text_color: '#FFFFFF' }, after: { type: 'text', text: under, bg_color: o.bg || '#FFFFFF', text_color: o.color || '#0F172A' }, brush_size: 60, reveal_threshold: 45, animation: 'none', required: !!o.required, aspect: o.aspect || '16/9', ...(o.prompt ? { prompt: o.prompt } : {}) } });
export const icons = (items, o = {}) => ({ t: 'icon_list', d: { items: items.map(([icon_url, title, h]) => ({ icon_url, title, html: h ? p(h) : '' })), columns: o.columns || 'auto', icon_size: o.size || 72, layout: o.layout || 'stacked', accent_color: NAVY, card: true } });
export const table = (columns, rows, o = {}) => ({ t: 'table', d: { columns: columns.map((label, i) => ({ id: `c${i}`, label, align: 'left' })), rows: rows.map((r, j) => ({ id: `r${j}`, cells: Object.fromEntries(r.map((v, i) => [`c${i}`, v])) })), striped: true, first_column_header: true, density: o.density || 'comfortable', accent_color: NAVY, ...(o.footnote ? { footnote: o.footnote } : {}) } });
export const vitals = (rows) => table(['Patient', 'Details'], rows, { density: 'compact' });
export const cta = (txt, label, url) => ({ t: 'cta', d: { text: txt, button_label: label, url, button_style: 'solid', align: 'center', button_color: NAVY } });
// quizzes
export const mc = (question, options, correct, good, bad, o = {}) => ({ t: 'quiz_inline', d: { question_type: 'multiple_choice', question, options, correct_answer: correct, show_feedback: true, feedback_correct: good, feedback_incorrect: bad, required: o.required ?? true } });
export const tf = (question, correct, good, bad) => ({ t: 'quiz_inline', d: { question_type: 'true_false', question, options: ['True', 'False'], correct_answer: correct, show_feedback: true, feedback_correct: good, feedback_incorrect: bad, required: true } });
// The viewer renders options in stored order (shuffle_options isn't implemented), so mix them here.
// Seeded from the question so the order is stable across rebuilds.
const mix = (items, seedText) => {
  let h = 0; for (const c of seedText) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const selectAll = (question, correct, wrong, good, bad, o = {}) => ({ t: 'quiz_inline', d: { question_type: 'select_all', question, instructions: 'Select all that apply.', options: mix([...correct, ...wrong], question), correct_answer: correct.join('; '), show_feedback: true, feedback_correct: good, feedback_incorrect: bad, required: o.required ?? true } });
export const categorize = (question, cats, good, bad) => ({ t: 'quiz_inline', d: { question_type: 'categorize', question, categories: cats.map(([name, items]) => ({ name, items })), options: cats.flatMap((c) => c[1]), show_feedback: true, feedback_correct: good, feedback_incorrect: bad, required: true } });
export const swipe = (question, left, right, cards) => ({ t: 'quiz_inline', d: { question_type: 'swipe', question, options: [left, right], swipe_cards: cards.map(([q, c]) => ({ question: q, correct: c })), swipe_accent_color: NAVY, show_feedback: true, required: false } });
export const fillBlank = (instructions, txt, distractors, good, bad) => ({ t: 'fill_blank', d: { mode: 'word_bank', instructions, text: txt, distractors, shuffle: true, show_feedback: true, required: true, feedback_correct: good, feedback_incorrect: bad, accent_color: NAVY } });
export const match = (instructions, pairs, good, o = {}) => ({ t: 'match_pairs', d: { instructions, pairs: pairs.map(([a, b, ia], i) => ({ id: `p${i + 1}`, prompt: ia ? { type: 'image', image_url: ia } : { type: 'text', text: a }, match: { type: 'text', text: b } })), shuffle: true, show_feedback: true, required: !!o.required, feedback_correct: good, accent_color: NAVY } });
export const row = (...cells) => ({ row: cells }); // cells: [block, width]

const S = (title, opts, ...items) => ({ title, ...opts, items });
const objectives = (clips, items) => S('Learning objectives', { clips }, list(items, { bullet: 'decimal', size: 'lg' }));
const takeHome = (clips, items) => S('Take-home messages', { clips, bg: '#F4F7FB' }, list(items, { dir: 'up', size: 'lg' }));
const resources = (clips, items, ...extra) => S('Additional resources', { clips }, list(items, { bullet: 'decimal', animate: false, color: NAVY, size: 'md' }), ...extra);

// ── lessons ──────────────────────────────────────────────────────────────────
export const lessons = (img) => [
{
  title: 'Mini lesson 1: Acute pain in sickle cell disease: Causes of pain and barriers to care',
  description: 'Review the causes and characteristics of acute pain in sickle cell disease, and challenge the myths and biases that affect pain management.',
  slides: [
    S('Welcome from Dr. Jennifer Bryan', { clips: [1] },
      row([image(img('image32.jpeg'), 'Portrait of Dr. Jennifer Bryan'), 4], [text(`<h3>Dr. Jennifer Bryan, MD, MA, MSPH, FRCP</h3><p>Department of Emergency Medicine, University Health Network, Toronto, Canada</p><p>Dr. Bryan is an emergency physician at University Health Network in Toronto, Canada. She is the clinical lead for sickle cell disease with Ontario Health. Her research and quality improvement work is focused on improving timely access to high quality care for people living with sickle cell disease.</p>`), 8]),
      callout('info', 'Why this module', p('This module is an attempt to address some of the barriers to care, and to ensure that patients living with sickle cell disease get the high quality, timely care that they deserve.'))),
    S('Your seven mini lessons', { clips: [2] },
      list(['Acute pain in sickle cell disease: Causes of pain and barriers to care', 'Acute pain in sickle cell disease: Assessment and acute management', 'Fever in sickle cell disease', 'Emergency approach to stroke in sickle cell disease', 'Acute chest syndrome in sickle cell disease', 'Emergency management of priapism in sickle cell disease', 'Acute anemia in sickle cell disease'], { bullet: 'decimal' })),
    objectives([3, 4], ['Review the causes and characteristics of acute pain in sickle cell disease.', 'Challenge common myths and biases that affect pain management.']),
    S('What causes acute pain in sickle cell disease?', { clips: [5] },
      row([compareImg(img('vessel-normal.jpg'), img('vessel-occluded.jpg'), 'Normal flow', 'Vaso-occlusion', 'Drag the handle to see what a sickled-cell blockage does to blood flow.', 'Image: scientificanimations.com/wiki-images'), 6],
          [list(['Sickled red blood cells are sticky and block small blood vessels.', 'This blockage reduces blood flow and oxygen delivery.', 'That causes damage and triggers inflammation.', 'The result: sudden, severe pain that can occur anywhere in the body, called a <strong>vaso-occlusive episode</strong>.'], { bullet: 'decimal' }), 6])),
    S('Vaso-occlusive episodes', { clips: [6], bgImage: img('image35.jpeg'), style: 'glass-dark' },
      text(`<h2>“Excruciating pain worse than the breaking of bones, more intense than the pain associated with labor and delivery.”</h2><p>Vaso-occlusive episodes occur most commonly in the <strong>bones, joints, chest, back and abdomen</strong>.</p><p style="font-size:0.75rem;opacity:0.8"><em>Background image: pexels.com</em></p>`)),
    S('Vaso-occlusive episode triggers', { clips: [7] },
      icons([[img('trigger-cold.png'), 'Cold weather'], [img('trigger-dehydration.png'), 'Dehydration'], [img('trigger-infection.png'), 'Infection'], [img('trigger-exertion.png'), 'Physical exertion'], [img('trigger-stress.png'), 'Stress']], { layout: 'inline', size: 56 })),
    S('VOE or something else?', { clips: [8] },
      callout('warning', 'Pain can be something else', p('Don’t discount other potentially dangerous causes of pain when you are considering a vaso-occlusive episode.')),
      list(['Osteomyelitis', 'Avascular necrosis', 'Compression fracture', 'Cholecystitis', 'Acute chest syndrome', 'Non-sickle cell specific causes'], { media: img('image46.jpeg'), alt: 'Magnifying glass', mediaSize: 'sm' })),
    S('“The doctors simply did not believe my pain was real.”', { clips: [9] },
      row([bubble('The doctors simply did not believe my pain was real.', 'Hertz Nazaire', 'Painter', undefined, 'left', 'dark'), 6], [image(img('image47.jpeg'), 'Painting by Hertz Nazaire of a crying face surrounded by sickled and red blood cells', 'Ten Redefined, EveryLife Foundation for Rare Diseases'), 6]),
      text(p('There are significant barriers to care for patients experiencing vaso-occlusive episodes related to sickle cell disease.'))),
    S('The pain is there… we just can’t always see it!', { clips: [10] },
      callout('info', 'Barrier: pain without objective findings', p('Pain in sickle cell disease, particularly in adults, can occur without objective physical findings. Someone may have excruciating knee pain, yet have full range of motion and a normal physical exam.')),
      reveal([{ url: img('image49.jpg'), alt: 'Child’s swollen hands and feet from dactylitis', caption: '<strong>Dactylitis in a child.</strong> The site of pain is very obvious to anyone looking at this child, but this level of pain does not always go along with objective findings in older children and adults.' },
              { url: img('image48.png'), alt: 'MRI of a foot during a vaso-occlusive episode', caption: '<strong>MRI of a vaso-occlusive episode causing severe foot pain.</strong> There are things happening below the surface that may not be obvious to us. Nabil Salem, Logain, et al. Egyptian Journal of Radiology and Nuclear Medicine 56.1 (2025): 216.' }], 'Tap to look closer')),
    S('“Drug seeker”', { clips: [11] },
      row([scratch('“Drug seeker”', 'They’re coming seeking care because they’re in excruciating pain.', { coverBg: RED, prompt: 'Scratch away the label to see what is really happening.' }), 7],
          [callout('info', 'Barrier: fear around opioids', p('The opioid epidemic is real and has had a devastating effect on the health of millions around the world. But patients with sickle cell disease are not coming to seek care because they are drug seekers.')), 5])),
    S('Stigma, racism and anti-Black racism', { clips: [12] },
      row([image(img('image50.jpeg'), 'A man in a suit, seen from the shoulders to the chin'), 5],
          [text(`<p>It’s very common to hear from patients who feel they need to <strong>dress up or present themselves in certain ways</strong> in order to be taken seriously in the emergency department.</p><p>Sickle cell disease affects people of all races, but it is much more common in patients who are Black or otherwise racialized. The impacts of racism and anti-Black racism in healthcare are real, and they affect the experiences of people living with sickle cell disease.</p>`), 7])),
    S('Myth or fact?', { type: 'interactive' },
      swipe('Swipe each statement: myth or fact?', 'Myth', 'Fact', [
        ['A normal physical exam and full range of motion mean a patient cannot be having severe pain.', 'left'],
        ['Patients with sickle cell disease come to seek care because they are in excruciating pain.', 'right'],
        ['Sickle cell disease only affects Black people.', 'left'],
        ['Racism and anti-Black racism in healthcare affect the experiences of people living with sickle cell disease.', 'right'],
      ])),
    S('Test your knowledge!', { clips: [13], type: 'quiz' },
      categorize('Sort each item: is it a common trigger of vaso-occlusive episodes, or another cause of acute pain in patients with sickle cell disease?', [
        ['Vaso-occlusive episode trigger', ['Cold weather', 'Dehydration', 'Physical exertion', 'Infection', 'Stress']],
        ['Another cause of acute pain', ['Osteomyelitis', 'Avascular necrosis', 'Compression fracture', 'Cholecystitis', 'Acute chest syndrome']],
      ], 'Correct. Triggers: cold, dehydration, physical exertion, infection, stress. Other causes: osteomyelitis, avascular necrosis, compression fracture, cholecystitis, acute chest syndrome and non-sickle cell specific causes.', 'Not quite. Think about what sets off a vaso-occlusive episode versus what else could be causing the pain.')),
    takeHome([14], ['Vaso-occlusive episodes are a common cause of severe pain in sickle cell disease', 'Other acute causes of pain must also be considered and addressed', 'Stigma, racism, anti-Black racism, and fears relating to the opioid epidemic are significant barriers to effective pain management in sickle cell disease']),
    resources([15], ['Takaoka, Kensuke, et al. “Mechanisms of pain in sickle cell disease.” <em>British Journal of Pain</em> 15.2 (2021): 213-220.', 'Anie, Kofi A. “The intersection of sickle cell disease, stigma, and pain in Africa.” <em>Hematology</em> 2024.1 (2024): 240-245.', 'World Health Organization Regional Office for Africa. <em>WHO SICKLE Package of Interventions for Sickle-Cell Disease Management: Comprehensive Care. Module 3.</em> WHO Regional Office for Africa, 2024.']),
  ],
},
{
  title: 'Mini lesson 2: Acute pain in sickle cell disease: Assessment and acute management',
  description: 'Recognize that pain is subjective, and start timely, guideline-based analgesia for vaso-occlusive pain episodes.',
  slides: [
    objectives([16, 17], ['Recognize that pain is subjective', 'Apply guideline-based strategies to optimize acute pain management.', 'Initiate timely and effective analgesia for vaso-occlusive pain episodes.']),
    S('Case: a 15-year-old boy', { clips: [18] },
      row([image(img('image51.jpg'), 'A teenage boy on a stretcher in a hospital, with a clinician beside him'), 6],
          [scratch('How much pain is he in? Scratch to find out.', 'He describes his pain as 10 out of 10.', { aspect: '4/3' }), 6]),
      vitals([['Age and sex', '15y M'], ['Medical history', 'HbS beta thal 0'], ['Chief complaint', 'Bilateral knee and hip pain'], ['Vitals', 'HR 80, RR 18, BP 100/70, O2 99% on room air, T 36.5°C']])),
    S('Pain expression does not equal pain experience', { clips: [19] },
      row([compareText(['Pain expression', 'Varies significantly between people, between places and across pain experiences. Patients may not be crying or writhing around.'], ['Pain experience', 'A lifetime of coping with pain can make expressions of pain very subdued, which can incorrectly lead people to discount the pain.'], 'Drag the handle to the left. What you see is not always what the patient feels.'), 8], [image(img('image52.jpg'), 'Close-up of a man’s face in profile', 'Image by Adeboro Odunlami from Pixabay'), 4])),
    S('Ask.', { clips: [20], bg: '#1A3C6E', style: 'glass-dark' },
      text('<h2>The only way to tell how much pain someone is having is to ask them.</h2>')),
    S('Distraction is a powerful adjunct in pain management', { clips: [21] },
      icons([[img('image53.png'), 'On their phone'], [img('image54.png'), 'Having something to eat'], [img('image55.png'), 'On their computer']], { columns: '3', size: 96 }),
      callout('warning', 'Don’t get distracted by distraction', p('Seeing someone eating a sandwich or playing a game on their phone doesn’t mean “they look fine.” It can be a sign that someone very experienced with acute pain is marshalling all of their own strategies because of the severity of their pain.'))),
    S('Start pain medications within 30 minutes', { clips: [22], bgImage: img('image56.jpg'), style: 'glass-dark' },
      text('<h2>Start pain medications within <strong>30 minutes</strong></h2><p>Starting pain medications early is related to more promising outcomes. Some guidelines say within 30 minutes of triage, some within 30 minutes of presentation, or even less. See the resources at the end of this mini lesson.</p>')),
    S('Pain management options', { clips: [23] },
      accordion([
        ['Non-pharmacologic', p('Comfort, distraction, heat')],
        ['NSAIDs and paracetamol/acetaminophen', '<ul><li>Management of mild to moderate pain</li><li>Adjunct in the management of moderate to severe pain</li></ul>'],
        ['Opioids', p('Morphine, hydromorphone and fentanyl are three commonly used opioids. See the next slide for how they compare.')],
        ['Ketamine', p('Paired with opioids for refractory pain. More on this shortly.')],
        ['Local regional anesthesia', p('Selective nerve blocks for very localized pain. More on this shortly.')],
      ], { media: img('image57.jpeg'), alt: 'A nurse holding a patient’s hands' })),
    S('Opioid analgesia: Pharmacokinetic comparison', { clips: [24] },
      table(['Drug, route', 'Onset (min)', 'Duration (h)'], [
        ['Morphine, oral (IR)', '60', '4-5'], ['Morphine, IV', '20', '4-5'],
        ['Hydromorphone, oral (IR)', '30', '4-5'], ['Hydromorphone, IV', '15', '4-5'],
        ['Fentanyl, sublingual/buccal effervescent tablets', '15-30', '4'], ['Fentanyl, IV', '<5', '30-60 minutes'],
      ], { density: 'compact', footnote: 'There may be other opioids used at your own setting. Check the onset and duration of each agent by route of administration.' })),
    S('Practice: how fast does it work?', { type: 'interactive' },
      match('Match each onset time to its IV opioid. Look back at the table if you need to.', [['<5 min', 'Fentanyl IV'], ['15 min', 'Hydromorphone IV'], ['20 min', 'Morphine IV']], 'That’s right. Knowing onset by route helps you plan timely analgesia.')),
    S('Ketamine and local regional anesthesia', { clips: [25] },
      row([callout('info', 'Ketamine', '<ul><li>0.1-0.3mg/kg over 15 minutes</li><li>Paired with opioids for refractory pain</li><li>Decreased need for opioids</li></ul>'), 6],
          [callout('tip', 'Local regional anesthesia', '<ul><li>Selective nerve blocks, helpful for very localized pain</li><li>Bupivacaine, ropivacaine</li><li>Typically reserved for patients going on to inpatient care</li></ul>'), 6])),
    S('Why not ask the expert?', { clips: [26] },
      row([image(img('image58.jpeg'), 'Silhouettes of a person growing from infancy to adulthood'), 6],
          [callout('tip', 'The expert is right in front of you', p('Your patient often has a lifetime of experience dealing with acute pain. Family members and other essential care partners can also tell you which pain management strategies have worked well in the past.')), 6])),
    S('Test your knowledge!', { clips: [27], type: 'quiz' },
      mc('Which of the following is the most accurate way to assess pain?', ['Watch the patient for grimacing, writhing or other signs', 'Check the most recent hemoglobin levels compared with previous', 'Ask the patient'], 'Ask the patient', 'Correct. Pain expression and pain experience are very different things.', 'Not quite. Remember: pain expression is not the same as pain experience.'),
      selectAll('Which of these are examples of opioid analgesia that could be used for acute pain in sickle cell disease?', ['Morphine', 'Fentanyl', 'Hydromorphone'], ['Ketamine', 'Paracetamol', 'Bupivacaine'], 'Correct: morphine, fentanyl and hydromorphone.', 'Not quite. Three of these are opioids.')),
    S('Review the answers', { clips: [28], bg: '#F4F7FB' },
      list(['<strong>Ask the patient</strong> is the most accurate way to assess pain.', '<strong>Morphine, fentanyl and hydromorphone</strong> are three examples of opioids. There may be others at your site, so be familiar with the agents you commonly use.'])),
    takeHome([29], ['Pain expression is not the same as pain experience', 'The best way to assess pain is to ask', 'Non-pharmacologic interventions are important adjuncts in pain management', 'Early initiation of analgesia is associated with better outcomes', 'Pharmacologic management options include NSAIDs, paracetamol, opioids, ketamine, regional anesthesia and others']),
    resources([30], ['Gillis, V. L., et al. “Management of an acute painful sickle cell episode in hospital: summary of NICE guidance.” <em>BMJ</em> 344 (2012).', 'National Heart, Lung, and Blood Institute. <em>Evidence-Based Management of Sickle Cell Disease: Expert Panel Report, 2014.</em> U.S. Department of Health and Human Services, National Institutes of Health (2014).', 'Rollé, Amélie, et al. “Pain control for sickle cell crisis, a novel approach? A retrospective study.” <em>Medicina</em> 59.12 (2023): 2196.']),
  ],
},
{
  title: 'Mini lesson 3: Fever in sickle cell disease',
  description: 'Recognize the causes and significance of fever in sickle cell disease, and start evidence-based investigations and empiric treatment.',
  slides: [
    objectives([31, 32], ['Recognize the causes and significance of fever in sickle cell disease.', 'Assess patients for serious bacterial infection and other complications.', 'Explore an approach to evidence-based investigations and empiric treatment.']),
    S('Case: a 19-year-old woman', { clips: [33] },
      row([vitals([['Age and sex', '19y F'], ['Medical history', 'HbSS'], ['Chief complaint', 'Fever, fatigue'], ['Vitals', 'HR 90, RR 18, BP 100/70, O2 99% on room air, 38°C']]), 6], [image(img('image59.jpg'), 'A young woman resting in a hospital bed'), 6])),
    S('Asplenia', { clips: [34] },
      row([callout('info', 'Functional asplenism', p('Up to 50% of adults with sickle cell disease. Repeated infarcts of the spleen leave them with essentially an auto-splenectomy.')), 5], [callout('info', 'Surgical asplenism', p('Splenectomy is a commonly used approach for splenic sequestration, so many patients have had their spleen removed.')), 5], [image(img('image60.png'), 'Illustration of a spleen'), 2]),
      callout('warning', 'Why we worry', p('The spleen is responsible for opsonizing encapsulated bacterial organisms.'))),
    S('Encapsulated organisms', {},
      row([image(img('image61.jpeg'), 'Illustration of bacteria'), 5],
          [list(['<em>H. influenzae</em> B', '<em>N. meningitidis</em>', '<em>S. pneumoniae</em>'], { size: 'xl', heading: 'Leading causes of invasive infection in asplenia' }), 7])),
    S('Back to the case', { clips: [35], type: 'interactive' },
      row([image(img('image59.jpg'), 'A young woman resting in a hospital bed'), 5],
          [selectAll('Our 19-year-old has a fever. What are some of the initial assessment steps you might take?', ['Review of systems', 'Physical exam', 'Blood cultures', 'Urine culture', 'Chest x-ray'], ['Wait for the fever to pass, then reassess'], 'Good thinking. Let’s walk through the approach.', 'Fever in sickle cell disease is an emergency, so don’t wait. Look at the options again.', { required: false }), 7])),
    S('Initial assessment', { clips: [36] },
      callout('info', 'Patient-specific and presentation-specific', p('Assessment and management always depend on the patient and how they present.')),
      accordion([
        ['Review of systems', p('Is there any obvious focus of infection, or an alternate non-infectious cause of fever?')],
        ['Physical exam', p('Conduct your physical exam.')],
        ['Investigations', '<p>In addition to routine blood work, look in the places where infections like to hide:</p><ul><li>Blood cultures</li><li>Urine culture</li><li>Chest x-ray</li></ul>'],
      ], { multiple: true })),
    S('Empiric management', { clips: [37] },
      list(['Supportive care', 'Empiric antibiotics', 'Source control'], { size: 'lg', bullet: 'decimal' }),
      callout('tip', 'Example from Dr. Bryan’s centre', '<p>With no clear source of infection:</p><ul><li>Start with ceftriaxone</li><li>Moxifloxacin for patients with a severe penicillin allergy</li><li>Add vancomycin for patients who are severely ill or have indwelling vascular access lines</li></ul>')),
    S('Test your knowledge!', { clips: [38], type: 'quiz' },
      mc('What proportion of adult patients with sickle cell disease are functionally asplenic?', ['10%', '25%', '50%', '90%'], '50%', 'Correct: about 50%.', 'Not quite. Think back to the asplenia slide.', { shuffle: false }),
      selectAll('Which three organisms are the leading causes of invasive bacterial infection due to asplenia?', ['H. influenzae B', 'N. meningitidis', 'S. pneumoniae'], ['E. coli', 'S. aureus', 'P. aeruginosa'], 'Correct: the encapsulated organisms H. influenzae B, N. meningitidis and S. pneumoniae.', 'Not quite. Think encapsulated organisms.')),
    S('Review the answers', { clips: [39], bg: '#F4F7FB' },
      list(['<strong>About 50%</strong> of adult patients with sickle cell disease are functionally asplenic.', 'The encapsulated organisms of particular concern are <strong><em>H. influenzae</em> B, <em>N. meningitidis</em> and <em>S. pneumoniae</em></strong>.'])),
    takeHome([40], ['Fever in a patient with sickle cell disease is an emergency', 'Most patients with sickle cell disease are functionally or surgically asplenic', 'Patients without a functioning spleen are at high risk for invasive infection by <em>H. influenzae</em> B, <em>N. meningitidis</em>, and <em>S. pneumoniae</em>', 'Early assessment and empiric antibiotics can be lifesaving']),
    resources([41], ['World Health Organization. <em>WHO Consolidated Guidelines for the Management of Common Childhood Illness: Management of Sickle-Cell Disease in Children and Adolescents.</em> World Health Organization (2026).', 'Hijazi, Laura S., et al. “Functional asplenism.” <em>StatPearls [Internet].</em> StatPearls Publishing, (2024).']),
  ],
},
{
  title: 'Mini lesson 4: Emergency approach to stroke in sickle cell disease',
  description: 'Recognize neurological emergencies in sickle cell disease and begin timely management of ischemic and hemorrhagic stroke.',
  slides: [
    objectives([42, 43], ['Recognize common neurological emergencies in sickle cell disease.', 'Develop an approach to assessing patients presenting with ischemic and hemorrhagic stroke.', 'Initiate timely investigations and emergency management of ischemic and hemorrhagic stroke.']),
    S('Neurological complications of sickle cell disease', { clips: [44, 45] },
      list(['Headache', 'Neuropathic pain', 'CNS infection', 'Neurocognitive impairment', 'Seizures', 'Central sinus venous thrombosis', 'Silent cerebral infarct', '<strong>Acute ischemic stroke</strong>', '<strong>Hemorrhagic stroke</strong>']),
      callout('warning', 'The highest stakes', p('Acute ischemic stroke and hemorrhagic stroke are perhaps the highest morbidity and mortality causing neurological complications of sickle cell disease.'))),
    S('Ischemic stroke: think FAST', { clips: [46, 47], type: 'interactive' },
      text(p('A handy mnemonic you can share with patients and family members. <strong>Scratch each letter to reveal it.</strong>')),
      row([scratch('F', 'Face drooping', { coverBg: RED, aspect: '4/3' }), 3], [scratch('A', 'Arm weakness', { coverBg: RED, aspect: '4/3' }), 3], [scratch('S', 'Speech difficulty', { coverBg: RED, aspect: '4/3' }), 3], [scratch('T', 'Time to act!', { coverBg: RED, aspect: '4/3' }), 3]),
      accordion([['What to look for', '<ul><li><strong>Face:</strong> face asymmetry</li><li><strong>Arm:</strong> arm weakness, or leg weakness</li><li><strong>Speech:</strong> dysarthria or aphasia</li><li><strong>Time:</strong> time is of the essence; act quickly to prevent long-term neurological deficits</li></ul>']], { open: 'none' })),
    S('Ischemic stroke: Acute management', { clips: ['48t'] },
      accordion([
        ['1. Involve your hematologist and neurologist', p('If possible. At Dr. Bryan’s centre, this includes activating a code stroke.')],
        ['2. Labs and vascular access', p('Obtain essential labs and vascular access for patients with signs of acute stroke.')],
        ['3. Imaging', p('Plain CT, CTA or MRI, depending on what’s available in your centre.')],
        ['4. Immediate blood transfusion', p('Indicated for any patient with sickle cell disease who is experiencing an ischemic stroke.')],
        ['5. Supportive care', p('Avoid secondary brain injury: maintain normal oxygen saturation, normal temperature and adequate hydration.')],
      ])),
    S('Hemorrhagic stroke symptoms', {},
      row([list(['Neurological deficits', 'Thunderclap headache', 'Altered level of consciousness', 'Vomiting'], { size: 'lg' }), 6],
          [hotspot(img('image62.jpg'), 'CT scan of the head; an arrow marks an area of bleeding', [[47, 42, 'Bleed', 'Hemorrhage on CT', 'The arrow marks an area of bleeding on this CT of the head. Image: Wikimedia Commons.']], 'Tap the marker.'), 6])),
    S('Hemorrhagic stroke management', { clips: [49] },
      table(['Step', 'Ischemic', 'Hemorrhagic'], [
        ['Who to involve', 'Hematologist and neurologist', 'Hematologist, neurologist and neurosurgeon'],
        ['Labs and access', 'Essential labs, vascular access', 'Routine labs, vascular access'],
        ['Imaging', 'CT, CTA or MRI', 'CT, CT angiography or MRI'],
        ['Transfusion', 'Immediate blood transfusion', 'Limited evidence; discuss with your local hematologist'],
        ['Supportive care', 'Avoid secondary brain injury', 'Reduce the risk of secondary brain injury'],
      ], { density: 'compact' }),
      callout('warning', 'Remember that early predictors of outcome are often incorrect!', p('Guidelines and evidence suggest deferring neuroprognostication for 48 to 72 hours after the onset of symptoms.'))),
    S('Test your knowledge!', { type: 'quiz' },
      selectAll('Which of these are acute neurologic complications of sickle cell disease?', ['Headache', 'CNS infection', 'Seizure', 'Central sinus venous thrombosis', 'Acute ischemic stroke', 'Hemorrhagic stroke'], ['Neurocognitive impairment', 'Silent cerebral infarct'], 'Correct: headache, CNS infection, seizure, CVST, acute ischemic stroke and hemorrhagic stroke.', 'Not quite. Two of these are not acute complications.'),
      fillBlank('Put the five steps in the initial management of ischemic stroke in order.', 'Step 1: [Involve hematology and neurology]. Step 2: [Get essential labs and vascular access]. Step 3: [Get imaging]. Step 4: [Immediate transfusion]. Step 5: [Supportive care].', [], 'Correct order.', 'Not quite. Try the order again.')),
    S('Review the answers', { clips: [50], bg: '#F4F7FB' },
      list(['Acute neurologic complications: <strong>headache, CNS infection, seizure, CVST, acute ischemic stroke, hemorrhagic stroke</strong>.', 'Initial management of ischemic stroke: <strong>1.</strong> involve hematology and neurology (activate a code stroke if that’s your protocol), <strong>2.</strong> essential labs and vascular access, <strong>3.</strong> imaging, <strong>4.</strong> immediate transfusion, <strong>5.</strong> supportive care.'])),
    takeHome([51], ['Patients with sickle cell disease are at risk for acute and chronic neurological complications', 'Two high morbidity and high mortality acute neurologic complications are ischemic and hemorrhagic stroke', 'Initial effective management of acute ischemic stroke includes immediate transfusion', 'In hemorrhagic stroke, neuroprognostication may not be possible for 48 to 72 hours']),
    resources([52], ['Al-Jafar, Hassan A., et al. “Neurological complications in sickle cell disease.” <em>Int J Clin Exp Neurol</em> 4.1 (2016): 9-18.', 'DeBaun, M. R., et al. “American Society of Hematology 2020 guidelines for sickle cell disease: prevention, diagnosis, and treatment of cerebrovascular disease in children and adults.” <em>Blood Advances</em> 4.8 (2020): 1554-1588.', 'Kassim, Adetola A., et al. “How I treat and manage strokes in sickle cell disease.” <em>Blood, The Journal of the American Society of Hematology</em> 125.22 (2015): 3401-3410.', 'Fox, Christine K., et al. “Hemorrhagic stroke in children and adults with sickle cell anemia: the Post-STOP cohort.” <em>Stroke</em> 53.11 (2022): e463-e466.', 'Hwang, David Y., et al. “Guidelines for neuroprognostication in critically ill adults with intracerebral hemorrhage.” <em>Neurocritical Care</em> 40.2 (2024): 395-414.']),
  ],
},
{
  title: 'Mini lesson 5: Acute chest syndrome in sickle cell disease',
  description: 'Recognize the signs of acute chest syndrome, and start investigations, supportive care and evidence-based management.',
  slides: [
    objectives([53, 54], ['Recognize the signs of acute chest syndrome.', 'Initiate appropriate investigations and supportive care.', 'Implement evidence-based acute management strategies.']),
    S('Acute chest syndrome is a cycle', { clips: [55] },
      row([hotspot(img('acs-cycle.svg'), 'Cycle diagram: sickling in the lung vasculature leads to worsening lung function, systemic desaturation and worsening sickling', [
        [62, 8, '1', 'Sickling in the lung vasculature', 'The cycle sometimes called the “death spiral” of acute chest syndrome starts here.'],
        [92, 38, '2', 'Worsening lung function', 'Sickling in the lung vasculature leads to worsening lung function.'],
        [62, 72, '3', 'Systemic desaturation', 'Worsening lung function leads to systemic desaturation.'],
        [32, 38, '4', 'Worsening sickling', 'Desaturation leads to worsening sickling, and so on.'],
      ], 'Tap each marker to follow the cycle.'), 7], [callout('warning', 'The “death spiral”', p('Acute chest syndrome is a cycle, sometimes called the death spiral: each step makes the next one worse.')), 5])),
    S('Case: a 12-year-old girl', { clips: [56] },
      row([vitals([['Age and sex', '12y F'], ['Medical history', 'HbSS'], ['Chief complaint', 'Chest pain, dyspnea'], ['Vitals', 'HR 120, RR 20, BP 100/60, O2 80% on room air, 36.5°C']]), 6], [image(img('image63.jpg'), 'A young girl in bed wearing an oxygen mask'), 6])),
    S('Acute chest syndrome: defining features', { clips: [57], bg: '#0F172A', style: 'glass-dark' },
      row([list(['<strong>New CXR infiltrates +</strong>', 'Fever', 'Hypoxia', 'Tachypnea', 'Increased work of breathing', 'Chest pain', 'Cough', 'Wheezing'], { color: TEAL }), 6],
          [hotspot(img('image64.jpeg'), 'Chest x-ray with an opacity at the base of one lung', [[26, 67, 'Infiltrate', 'New infiltrate', 'A new infiltrate on chest x-ray, along with any combination of these symptoms, defines acute chest syndrome. Image: A. Greenough, K. Sylvester, 2006.']], 'Tap the marker.', TEAL), 6])),
    S('Causes of acute chest syndrome', { clips: [58] },
      row([callout('info', 'Infectious', '<p>Often the cause:</p><ul><li>Bacterial</li><li>Viral</li></ul>'), 5], [callout('tip', 'Non-infectious', '<ul><li>Pulmonary infarction</li><li>Hypoventilation, sometimes precipitated by opioids</li><li>Fat embolism</li><li>Pulmonary edema from fluid overload</li></ul>'), 7]),
      callout('warning', 'Be cautious with parenteral fluids', p('Pulmonary edema from fluid overload is one reason to be cautious with parenteral fluids in patients with sickle cell disease.'))),
    S('Investigation and management', { clips: [59, 60] },
      callout('warning', 'Do not wait to treat if there is a delay to x-ray', p('If a patient has respiratory symptoms, chest pain or other features that concern you, do not delay treatment while waiting for investigations.')),
      accordion([
        ['Investigations', '<ul><li>Chest X-ray</li><li>Full blood count</li><li>Reticulocyte count</li><li>Inflammatory markers (CRP)</li><li>Basic biochemistry tests (creatinine and liver function)</li><li>Blood group, and crossmatch</li><li>Blood cultures, sputum for microscopy, and culture as needed</li><li>+/- ABG, CTA</li></ul>'],
        ['Management', '<ul><li>Incentive spirometry: encourage nice deep breaths in and out</li><li>Analgesia</li><li>Antibiotics +/- antivirals +/- anti-malarials</li><li>Simple transfusion (“top-up”) / exchange transfusion</li><li>Bronchodilators if history of reactive airway disease</li><li>Recurrence prevention: try to identify the triggers</li></ul>'],
      ])),
    S('Test your knowledge!', { clips: [61], type: 'quiz' },
      fillBlank('Complete the acute chest syndrome cycle.', '[Sickling] in the lungs leads to [worsened lung function], which causes [decreased oxygen saturation], which leads to [worsening sickling].', ['improved oxygenation'], 'Correct. That’s the cycle, sometimes called the death spiral.', 'Not quite. Follow the cycle around again.'),
      categorize('Sort each cause of acute chest syndrome.', [['Infectious', ['Bacterial', 'Viral']], ['Non-infectious', ['Pulmonary infarction', 'Hypoventilation', 'Fat embolism', 'Pulmonary edema from fluid overload']]], 'Correct.', 'Not quite. Which of these involve an organism?')),
    S('Review the answers', { clips: [62], bg: '#F4F7FB' },
      list(['<strong>The cycle:</strong> sickling in the lungs leads to worsened lung function, which causes decreased oxygen saturation, which leads to worsening sickling.', '<strong>Non-infectious causes:</strong> pulmonary infarction, hypoventilation, fat embolism, pulmonary edema from fluid overload.'])),
    takeHome([63], ['Acute chest syndrome is a leading cause of death in patients with sickle cell disease', 'Acute chest syndrome is characterized by abnormal chest imaging findings, fever, chest pain, and respiratory symptoms', 'A delay to chest x-ray should not delay initiation of treatment', 'Treatment includes addressing the underlying cause, transfusion, and providing supportive care']),
    resources([64], ['World Health Organization Regional Office for Africa. <em>WHO SICKLE Package of Interventions for Sickle-Cell Disease Management: Comprehensive Care. Module 3.</em> WHO Regional Office for Africa, 2024.', 'Samuel, Adegoke, et al. “Paediatric Association of Nigeria guidelines on the management of acute chest syndrome in children with sickle cell disease (2023).” <em>Nigerian Journal of Paediatrics</em> 51.1 (2024): 37-54.']),
  ],
},
{
  title: 'Mini lesson 6: Emergency management of priapism in sickle cell disease',
  description: 'Recognize ischemic priapism as a time-sensitive emergency, assess for complications and triggers, and start evidence-based emergency management.',
  slides: [
    objectives([65, 66], ['Recognize ischemic priapism as a time-sensitive emergency.', 'Assess patients with priapism for complications and underlying triggers.', 'Initiate evidence-based emergency management.']),
    S('What is major priapism?', { clips: [67] },
      list(['Persistent painful erection', 'Ischemic priapism is common in sickle cell disease']),
      row([callout('info', 'Less than 4 hours: stuttering priapism', p('Self-resolving, but a danger sign for the development of major priapism.')), 6], [callout('warning', 'More than 4 hours: major priapism', p('A medical emergency, with significant risk of future sexual dysfunction and mental distress.')), 6]),
      callout('info', 'High-flow priapism', p('Less common and associated with arterial injury. It is possible after surgical management of ischemic priapism.'))),
    S('Quick check: stuttering or major?', { type: 'interactive' },
      swipe('Swipe each statement to the type of priapism it describes.', 'Stuttering', 'Major', [
        ['Lasts more than 4 hours', 'right'], ['Self-resolving', 'left'], ['A medical emergency', 'right'], ['A danger sign for what may come next', 'left'],
      ])),
    S('Triggers', { clips: [68] },
      list(['Infection', 'Full bladder', 'Dehydration', 'Select medications', 'Recreational drugs'], { size: 'lg' }),
      callout('tip', 'You may not find a trigger', p('You may not identify a specific trigger in the patient you’re assessing. For a list of medications, see Idris et al. 2022 in the resources for this mini lesson.'))),
    S('Assessment and management', { clips: [69] },
      callout('info', 'Diagnosis is clinical', p('Based on history and exam. Priapism is often associated with shame and stigma, so patients may be reluctant to disclose it, or delay coming in.')),
      accordion([
        ['Step 1: Non-invasive interventions', '<ul><li>Exercise: a quick run up and down a flight of stairs can provide relief for some patients</li><li>Analgesia</li><li>Hydration</li><li>Heat/cold: we usually avoid cold in sickle cell disease, but this is one situation where cold applied directly to the genital area may help</li></ul>'],
        ['Step 2: Corporal aspiration and phenylephrine injection', p('Can be done by acute care clinicians.')],
        ['Step 3: Shunt surgery +/- penile implant', p('By urology, if these interventions are not effective.')],
      ])),
    S('Corporal aspiration and phenylephrine injection', { clips: [70] },
      row([image(img('image66.jpg'), 'Gloved hands demonstrating corporal aspiration on a training model', 'Image: Life in the Fast Lane (LITFL). Use 1-2mL each side, avoiding the dorsal arteries and aspirating.'), 7],
          [cta('An excellent review of this procedure is available through Life in the Fast Lane.', 'Open the LITFL procedure review', 'https://litfl.com/procedure-priapism-management/'), 5])),
    S('Mental health impacts', { clips: [71], bgImage: img('image68.jpeg'), style: 'glass-dark' },
      list(['Depression', 'Anxiety', 'Suicidality'], { size: 'xl', color: '#FFFFFF' }),
      text(p('Explore with your patients how they are coping from a mental health perspective, and identify potential resources that may be helpful.'))),
    S('Secondary priapism prevention', { clips: [72] },
      list(['Hydroxyurea', 'Alpha receptor antagonists (e.g., pseudoephedrine)', 'Sildenafil', 'Hormonal therapies'], { size: 'lg' }),
      callout('info', 'Limited evidence', p('There has been some promise in adults for sildenafil and hormonal therapies, but these are not yet in general practice.'))),
    S('Test your knowledge!', { clips: [73], type: 'quiz' },
      tf('True or false: High flow priapism is more common in sickle cell disease than ischemic priapism?', 'False', 'False! High flow priapism is related to arterial injury. Low flow, or ischemic priapism is more common in sickle cell disease.', 'Not quite. Think about what causes high flow priapism.'),
      selectAll('Which are non-invasive interventions that may help resolve priapism?', ['Exercise', 'Hydration', 'Pain management', 'Heat/cold application'], ['Corporal aspiration', 'Shunt surgery'], 'Correct: exercise, hydration, pain management and heat/cold application.', 'Not quite. Two of these are invasive.')),
    S('Review the answers', { clips: [74], bg: '#F4F7FB' },
      list(['<strong>False.</strong> High flow priapism is related to arterial injury, which is less common in sickle cell disease. Low flow, or ischemic priapism, is more common.', 'Non-invasive interventions include <strong>exercise, hydration, pain management, and heat/cold application</strong>: all things you can try while preparing for more invasive options.'])),
    takeHome([75], ['Priapism is common in sickle cell disease', 'It is associated with erectile dysfunction and mental distress', 'Emergency intervention is required within 4 hours to preserve erectile function', 'Emergency management includes non-invasive interventions, corporal aspiration and irrigation, and may require surgery', 'There is limited evidence for secondary prevention strategies, but hydroxyurea and alpha receptor antagonists are commonly used']),
    resources([76], ['Idris, Ibrahim M., Arthur L. Burnett, and Michael R. DeBaun. “Epidemiology and treatment of priapism in sickle cell disease.” <em>Hematology</em> 2022.1 (2022): 450-458.', 'Bivalacqua, Trinity J., et al. “The diagnosis and management of recurrent ischemic priapism, priapism in sickle cell patients, and non-ischemic priapism: an AUA/SMSNA guideline.” <em>The Journal of Urology</em> 208.1 (2022): 43-52.', 'Miers, James, and John Mackenzie. “Procedure: Priapism Management.” <em>Life in the Fast Lane (LITFL)</em>, 18 Sept. 2025. Accessed 30 June 2026. <a href="https://litfl.com/procedure-priapism-management/">https://litfl.com/procedure-priapism-management/</a>']),
  ],
},
{
  title: 'Mini lesson 7: Acute anemia in sickle cell disease',
  description: 'Recognize causes of acute anemia in sickle cell disease, identify appropriate investigations and outline an approach to emergency management.',
  slides: [
    objectives([77, 78], ['Recognize causes of acute anemia in sickle cell disease.', 'Identify appropriate investigations.', 'Outline an approach to emergency management.']),
    S('Case: a 2-year-old boy', { clips: [79] },
      row([vitals([['Age and sex', '2y M with HbSS'], ['Chief complaint', '12h fatigue, pallor, swollen abdomen'], ['Triage vitals', 'HR 160, BP 70/40, T 36.5, O2 98%'], ['Exam', 'Lethargic. Conjunctival pallor. Chest clear. Abd distended, palpable spleen at umbilicus']]), 7], [image(img('image69.jpg'), 'A toddler asleep on a bed'), 5]),
      callout('tip', 'Reflect', p('What are the potential diagnoses?'))),
    S('Acute anemia: the differential', { clips: [80] },
      list(['Hemolysis', 'Hyperhemolysis, if recently transfused', 'Aplastic crisis', 'Acute splenic sequestration', 'Hepatic sequestration'], { size: 'lg' })),
    S('More information on this little boy', { clips: [81], type: 'interactive' },
      list(['Baseline hgb 80g/L (8 g/dL), today is 55', 'Elevated reticulocyte count: his bone marrow is doing what it can', 'Bilirubin at baseline']),
      mc('What is the most likely diagnosis?', ['Hemolysis', 'Hyperhemolysis', 'Aplastic crisis', 'Acute splenic sequestration', 'Hepatic sequestration'], 'Acute splenic sequestration', 'Correct: acute splenic sequestration.', 'Not quite. Look again at his exam: a palpable spleen at the umbilicus, an elevated reticulocyte count and a bilirubin at baseline.', { shuffle: false, required: false })),
    S('Acute splenic sequestration', { clips: [82, 83] },
      row([list(['Pooling of sickled RBCs in the spleen', 'Sudden splenic enlargement (within hours)', 'Acute anemia', '+/- thrombocytopenia', 'Reticulocytosis', 'Most common 6 months to 5 years', 'May be associated with a viral illness, for example parvovirus B19']), 7],
          [hotspot(img('image73.jpg'), 'A child with the enlarged spleen outlined in pen on the abdomen', [[57, 70, 'Spleen', 'Sudden splenic enlargement', 'The enlarged belly this little boy’s parents noticed.']], 'Tap the marker.'), 5])),
    S('Acute splenic sequestration management', { clips: ['84t'] },
      list(['Send essential labs, reticulocytes and markers of hemolysis, electrolytes, glucose, organ function tests, group and screen', 'Obtain vascular access', 'If hemoglobin more than 20g/L below baseline transfuse and notify hematologist', 'Transfuse 5-10ml/kg', 'Address underlying precipitant including infection'], { bullet: 'decimal' }),
      cta('These steps are from The Hospital for Sick Children (SickKids), Toronto.', 'Open the SickKids guideline', 'https://webfiles.sickkids.ca/files/cpg/CLINS218/Main%20Document.pdf')),
    S('Risks of blood transfusion', { clips: [85] },
      row([list(['Alloimmunization: patients are likely to require multiple transfusions in their lifetimes', 'Hyperhemolysis: a delayed transfusion reaction', 'Hyperviscosity', 'Hypocalcemia', 'Iron overload', 'Other transfusion reactions'], { size: 'lg' }), 8], [image(img('image71.jpg'), 'A pair of dice'), 4]),
      callout('warning', 'Why we restrict emergency transfusion', p('Emergency transfusion in sickle cell disease is generally limited to a few select acute complications.'))),
    S('Emergency transfusion', { clips: [86] },
      reveal([{ url: img('image72.jpg'), alt: 'Chest x-ray', caption: '<strong>Acute chest syndrome</strong>' }, { url: img('image73.jpg'), alt: 'A child with an enlarged spleen outlined on the abdomen', caption: '<strong>Acute splenic sequestration</strong>' }, { url: img('image74.jpeg'), alt: 'CT scan of the head', caption: '<strong>Acute ischemic stroke</strong>' }], 'Tap to reveal')),
    S('Test your knowledge!', { clips: [87], type: 'quiz' },
      selectAll('Which of these are causes of acute anemia in sickle cell disease?', ['Hemolysis', 'Hyperhemolysis', 'Acute splenic sequestration', 'Hepatic sequestration', 'Aplastic crisis'], ['Iron overload', 'Priapism'], 'Correct: hemolysis, hyperhemolysis, acute splenic sequestration, hepatic sequestration and aplastic crisis.', 'Not quite. Two of these are not causes of acute anemia.')),
    S('Test your knowledge: risks of transfusion', { type: 'quiz' },
      selectAll('Which of these are risks of transfusion in sickle cell disease?', ['Alloimmunization', 'Hyperhemolysis', 'Hyperviscosity', 'Hypocalcemia', 'Iron overload'], ['Hypercalcemia', 'Iron deficiency'], 'Correct, along with other acute and delayed transfusion reactions.', 'Not quite. Two of these are not risks of transfusion.')),
    S('Test your knowledge: emergency transfusion', { type: 'quiz' },
      match('Match each image to the situation in which emergency transfusion may be strongly indicated.', [['', 'Acute chest syndrome', img('image72.jpg')], ['', 'Acute splenic seques­tration', img('image73.jpg')], ['', 'Acute ischemic stroke', img('image74.jpeg')]], 'Correct: acute chest syndrome, acute splenic sequestration and acute ischemic stroke.', { required: true })),
    S('Review the answers', { clips: [88], bg: '#F4F7FB' },
      list(['<strong>Causes of acute anemia:</strong> hemolysis, hyperhemolysis, acute splenic sequestration, hepatic sequestration, aplastic crisis.', '<strong>Risks of transfusion:</strong> alloimmunization, hyperhemolysis, hyperviscosity, hypocalcemia, iron overload, other acute and delayed transfusion reactions.', '<strong>Emergency transfusion may be strongly indicated in:</strong> acute chest syndrome, acute splenic sequestration, acute ischemic stroke.'])),
    takeHome([89], ['Acute anemia is life-threatening in sickle cell disease', 'Acute splenic sequestration is one dangerous cause of acute anemia, mainly affecting children', 'Urgent transfusion is part of the management of acute splenic sequestration, acute chest syndrome and ischemic stroke for most patients with sickle cell disease', 'Urgent transfusion should be used sparingly in other situations due to the associated acute and delayed risks']),
    resources([90], ['The Hospital for Sick Children (SickKids). <em>Acute Splenic Sequestration: Guidelines for Management in Children with Sickle Cell Disease.</em> Version 3, The Hospital for Sick Children, approved 31 July 2025. Accessed 11 July 2026. <a href="https://webfiles.sickkids.ca/files/cpg/CLINS218/Main%20Document.pdf">SickKids guideline (PDF)</a>', 'World Health Organization Regional Office for Africa. <em>WHO SICKLE Package of Interventions for Sickle-Cell Disease Management: Comprehensive Care. Module 3.</em> WHO Regional Office for Africa, 2024.']),
    S('Thank you!', { clips: [91, 92], bg: '#F4F7FB' },
      text(p('You’ve reached the end of the module on emergency assessment and management of acute complications of sickle cell disease. Check out the resources at the end of each mini lesson to dive deeper.')),
      callout('info', 'Follow and connect with us', '<p>@iblooddisorders</p><p style="overflow-wrap:anywhere">Email: <a href="mailto:hcpsupport@inheritedblooddisorders.world">hcpsupport@<wbr>inheritedblooddisorders.world</a></p><p>Website: <a href="https://inheritedblooddisorders.world">inheritedblooddisorders.world</a></p>')),
  ],
},
];
