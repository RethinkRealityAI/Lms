#!/usr/bin/env node
/**
 * Builds + loads the Emergency SCD course from content.mjs (idempotent; keeps course and lesson ids).
 *   node scripts/import-gansid-modules/emergency-scd/build.mjs <assetsDir> <deckMediaDir> <transcriptsDir> [--dry]
 * Course is created as DRAFT. Uses the service role from .env.local.
 *
 * Own loader rather than load-plan.ts: that script's image normaliser rewrites every one-image
 * gallery to mode 'single', which would silently strip hotspots.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { lessons, COURSE } from './content.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('='))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const [assets, media, tx] = process.argv.slice(2);
const dry = process.argv.includes('--dry');

const GANSID = '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a';
const CREATOR = '485e3136-1337-41c3-b8a2-d0d98accb541';
const BUCKET = 'canva-exports';
const PREFIX = 'gansid-modules/emergency-scd';
const pub = (p) => `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}/${p}`;
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.m4a': 'audio/mp4' };
const uploads = new Map();
const img = (n) => {
  const f = path.join(assets, 'img', n);
  if (!fs.existsSync(f)) throw new Error('missing image ' + n);
  uploads.set(`img/${n}`, f);
  return pub(`img/${n}`);
};

// Transcript clean-up: Whisper mishearings of names and clinical terms only.
const FIX = [
  [/GANSED|GANSET/g, 'GANSID'], [/minimal lesson/g, 'mini lesson'], [/mini-lesson/g, 'mini lesson'], [/mini-module/g, 'mini lesson'],
  [/vaso-clusive|vaso-inclusive/g, 'vaso-occlusive'], [/These reclusive/g, 'Vaso-occlusive'], [/these occlusive/g, 'vaso-occlusive'],
  [/Nesaire/g, 'Nazaire'], [/Cattamine/g, 'Ketamine'], [/lupivacaine/g, 'ropivacaine'], [/impaired treatment/g, 'empiric treatment'],
  [/oxidizing/g, 'opsonizing'], [/spleen off also/g, 'spleen, also'], [/vichomycin/g, 'vancomycin'], [/\b(each|age) flu/g, 'H. flu'],
  [/nyseria meningititis|nysirium and angiotitis/g, 'Neisseria meningitidis'], [/Acheemic|Achemic/g, 'Ischemic'], [/achemic/g, 'ischemic'],
  [/aphoresis|a for oresis|AFRI's/g, 'apheresis'], [/Scuttering priapism is self-res lasts/g, 'Stuttering priapism is self-resolving, lasts'],
  [/parantaral/g, 'parenteral'], [/And algezia/g, 'Analgesia'], [/wifical cell/g, 'sickle cell'], [/panel implant/g, 'penile implant'],
  [/pseudo-fadrin/g, 'pseudoephedrine'], [/Sickle-Sevel/g, 'Sickle Cell'], [/embolicus/g, 'umbilicus'], [/asymatic sequestration/g, 'splenic sequestration'],
  [/cycling sickling/g, 'sickling'], [/a show\./g, 'as shown.'], [/contacts\./g, 'contexts.'], [/precipitates/g, 'precipitants'], [/Sick Kids/g, 'SickKids'],
  [/the the /g, 'the '], [/A priapism can/g, 'Priapism can'], [/family members fast\./g, 'family members: FAST.'], [/is a clinical based/g, 'is clinical, based'],
  [/whether you got access/gi, 'whether you have access'], [/In addition to ischemic stroke,$/, ''], [/Now a word on transfusion is$/, ''],
];
const clean = (s) => FIX.reduce((t, [a, b]) => t.replace(a, b), s.trim()).trim();
const clipSrc = (c) => (String(c).endsWith('t') ? path.join(assets, 'audio', `m${c}.m4a`) : path.join(media, `media${c}.m4a`));
const transcript = (clips) => clips.map((c) => clean(fs.readFileSync(path.join(tx, `media${parseInt(c, 10)}.txt`), 'utf8'))).join(' ');

function audioFor(clips) {
  const out = path.join(assets, 'audio', `n${clips.join('-')}.m4a`);
  if (!fs.existsSync(out)) {
    if (clips.length === 1) fs.copyFileSync(clipSrc(clips[0]), out);
    else {
      const lst = `${out}.txt`;
      fs.writeFileSync(lst, clips.map((c) => `file '${clipSrc(c).replace(/\\/g, '/')}'`).join('\n'));
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out]);
      fs.unlinkSync(lst);
    }
  }
  uploads.set(`audio/${path.basename(out)}`, out);
  return pub(`audio/${path.basename(out)}`);
}

// Expand a slide: narration (with its transcript toggle) on top, then content, with grid positions.
function expand(s, order) {
  const blocks = [];
  let y = 0;
  const push = (b, x = 0, w = 12) => blocks.push({ block_type: b.t, title: null, order_index: blocks.length, is_visible: true, data: { ...b.d, gridX: x, gridY: y, gridW: w, gridH: 3 } });
  const stack = (b) => { push(b); y += 3; };
  if (s.clips) stack({ t: 'audio', d: { url: audioFor(s.clips), title: 'Dr. Jennifer Bryan', transcript: `${transcript(s.clips)}

Auto-generated transcript of the narration.`, autoplay: false } });
  for (const it of s.items) {
    if (it.row) { let x = 0; for (const [b, w] of it.row) { push(b, x, w); x += w; } y += 3; } else stack(it);
  }
  return {
    slide: {
      slide_type: s.type || 'content', title: s.title, order_index: order, status: 'published',
      settings: { background: s.bg || '#FFFFFF', ...(s.bgImage ? { background_image: s.bgImage } : {}), block_style: s.style || 'glass' },
    },
    blocks,
  };
}

function validate(ls) {
  const errs = [];
  ls.forEach((l, i) => l.built.forEach(({ slide, blocks }) => blocks.forEach((b) => {
    const d = b.data; const at = `L${i + 1} "${slide.title}" ${b.block_type}`;
    if (b.block_type === 'quiz_inline') {
      if (d.explanation) errs.push(`${at}: explanation set`);
      if (['multiple_choice', 'true_false'].includes(d.question_type) && !d.options.includes(d.correct_answer)) errs.push(`${at}: answer not in options`);
      if (d.question_type === 'select_all') {
        for (const c of d.correct_answer.split('; ')) if (!d.options.includes(c)) errs.push(`${at}: select-all answer ${c}`);
        if (new Set(d.options).size !== d.options.length) errs.push(`${at}: duplicate options`);
      }
      if (d.question_type === 'categorize' && new Set(d.options).size !== d.options.length) errs.push(`${at}: item in two categories`);
    }
    if (b.block_type === 'table') for (const r of d.rows) for (const v of Object.values(r.cells)) if (/<[a-z/][^>]*>/i.test(v)) errs.push(`${at}: html in cell`);
  })));
  return errs;
}

const built = lessons(img).map((l) => ({ ...l, built: l.slides.map((s, i) => expand(s, i)) }));
const thumb = img(COURSE.thumbnail);
const errs = validate(built);
if (errs.length) { console.error(errs.join('\n')); process.exit(2); }

const used = built.flatMap((l) => l.slides.flatMap((s) => (s.clips || []).map((c) => parseInt(c, 10))));
const missing = []; for (let i = 1; i <= 92; i++) if (!used.includes(i)) missing.push(i);
const nBlocks = built.reduce((n, l) => n + l.built.reduce((m, s) => m + s.blocks.length, 0), 0);
console.log(`lessons ${built.length}, slides ${built.reduce((n, l) => n + l.built.length, 0)}, blocks ${nBlocks}, clips used ${used.length}, unused [${missing}], dupes ${used.length - new Set(used).size}, uploads ${uploads.size}`);
const counts = {};
built.forEach((l) => l.built.forEach((s) => s.blocks.forEach((b) => {
  const k = b.block_type === 'quiz_inline' ? `quiz:${b.data.question_type}` : b.data.mode === 'hotspot' ? 'hotspot' : b.block_type;
  counts[k] = (counts[k] || 0) + 1;
})));
console.log(counts);
if (dry) process.exit(0);

for (const [key, file] of uploads) {
  const { error } = await sb.storage.from(BUCKET).upload(`${PREFIX}/${key}`, fs.readFileSync(file), { upsert: true, contentType: TYPES[path.extname(file).toLowerCase()], cacheControl: '3600' });
  if (error) throw new Error(`upload ${key}: ${error.message}`);
}
console.log('uploaded', uploads.size);

let { data: course } = await sb.from('courses').select('id,status').eq('slug', COURSE.slug).maybeSingle();
const fields = { title: COURSE.title, description: COURSE.description, thumbnail_url: thumb };
if (!course) {
  const { data, error } = await sb.from('courses').insert({ ...fields, slug: COURSE.slug, institution_id: GANSID, created_by: CREATOR, status: 'draft', is_published: false, access_mode: 'all', sequential_lessons: true }).select('id,status').single();
  if (error) throw error;
  course = data;
} else {
  const { error } = await sb.from('courses').update(fields).eq('id', course.id);
  if (error) throw error;
}
let { data: mod } = await sb.from('modules').select('id').eq('course_id', course.id).is('deleted_at', null).maybeSingle();
if (!mod) {
  const { data, error } = await sb.from('modules').insert({ course_id: course.id, institution_id: GANSID, title: COURSE.title, order_index: 0, is_published: true }).select('id').single();
  if (error) throw error;
  mod = data;
}
for (let i = 0; i < built.length; i++) {
  const l = built[i];
  const lf = { title: l.title, description: l.description };
  let { data: lr } = await sb.from('lessons').select('id').eq('course_id', course.id).eq('order_index', i).is('deleted_at', null).maybeSingle();
  if (!lr) {
    const { data, error } = await sb.from('lessons').insert({ ...lf, course_id: course.id, module_id: mod.id, institution_id: GANSID, content_type: 'blocks', order_index: i, is_required: true }).select('id').single();
    if (error) throw error;
    lr = data;
  } else {
    const { error } = await sb.from('lessons').update(lf).eq('id', lr.id);
    if (error) throw error;
  }
  for (const tbl of ['lesson_blocks', 'slides']) {
    const { error } = await sb.from(tbl).delete().eq('lesson_id', lr.id);
    if (error) throw error;
  }
  for (const { slide, blocks } of l.built) {
    const { data: sr, error } = await sb.from('slides').insert({ ...slide, lesson_id: lr.id }).select('id').single();
    if (error) throw error;
    if (blocks.length) {
      const { error: be } = await sb.from('lesson_blocks').insert(blocks.map((b) => ({ ...b, lesson_id: lr.id, slide_id: sr.id, institution_id: GANSID })));
      if (be) throw be;
    }
  }
  console.log(`  L${i + 1}: ${l.built.length} slides -> ${lr.id}`);
}
console.log('COURSE', course.id, 'status', course.status);
