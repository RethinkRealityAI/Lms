/**
 * SCAGO HCP curriculum — the public marketing view of the 13-module program.
 *
 * This is the SINGLE SOURCE OF TRUTH for the landing page curriculum grid and
 * for the thumbnail-migration script, so the public page and the in-platform
 * course cards can never drift apart on imagery.
 *
 * `image` currently points at the Higgsfield CDN (where the art was generated).
 * `scripts/migrate-generated-images/` re-hosts each file in the Supabase
 * `course-thumbnails` bucket, sets `courses.thumbnail_url` for the matching
 * module, and rewrites the URLs below to the Supabase originals. Until that has
 * run, treat these URLs as provisional: every consumer degrades to a branded
 * gradient if the image fails to load, so an expired CDN link can never break
 * the layout.
 */

export interface ScagoModule {
  /** Module number as published (1-13); also how the DB course is matched. */
  number: number;
  title: string;
  /** Short topic tag shown as an overlay chip on the card image. */
  topic: string;
  lessons: number;
  description: string;
  authors: string;
  /** 16:9 cover art. */
  image: string;
}

const GEN = 'https://d8j0ntlcm91z4.cloudfront.net/user_33Txeg6YsaHeKOwmprAOf8Wr55B';

/** Landing-page imagery generated alongside the module covers. */
export const SCAGO_LANDING_IMAGES = {
  /** Hero: physician explaining something to a young patient. 16:9 */
  hero: `${GEN}/hf_20260725_025841_f28f0c90-30d3-41ea-9fe5-8190c280a557.png`,
  /** Wide banner: clinician learning on a tablet in a corridor. 21:9 */
  banner: `${GEN}/hf_20260725_030218_94e575f8-4526-4d02-9554-183f3ac1197b.png`,
  /** Support section: healthcare educator ready to help. 16:9 */
  support: `${GEN}/hf_20260725_030220_456651df-b8b1-4a33-be06-cd72ed08d2f7.png`,
} as const;

export const SCAGO_MODULES: ScagoModule[] = [
  {
    number: 1,
    title: 'Fundamentals of Sickle Cell Disease',
    topic: 'Foundations',
    lessons: 5,
    description:
      "Introduction to Sickle Cell Disease, how it's diagnosed, and the basic biology of the disease.",
    authors: 'Karen Fleming',
    image: `${GEN}/hf_20260725_030125_780298f6-8cd8-4aee-bd62-d4ea0c52a21b.png`,
  },
  {
    number: 2,
    title: 'Ontario Health Quality Standards for SCD',
    topic: 'Standards',
    lessons: 2,
    description:
      "Ontario Health's Sickle Cell Disease Quality Standards — statements, implementation and impact.",
    authors: 'Karen Fleming, Carol Kennedy-Yee, Health Quality Ontario Team',
    image: `${GEN}/hf_20260725_030127_5f4ce74d-2a4f-46fa-8fa9-ae1e75e9c44e.png`,
  },
  {
    number: 3,
    title: 'Acute Pain in Sickle Cell Disease',
    topic: 'Pain Care',
    lessons: 5,
    description:
      'Pathophysiology of pain, pain management strategies, and the unique challenges of managing pain in SCD.',
    authors: 'Dr. Robert Klaassen, Karen Fleming, Dr. Sarah Patterson',
    image: `${GEN}/hf_20260725_030130_ab328272-69ad-4423-9ea2-b3093ed0d189.png`,
  },
  {
    number: 4,
    title: 'Transfusions, Hydroxyurea & Provincial Drug Coverage',
    topic: 'Treatment',
    lessons: 3,
    description:
      'Complexities of transfusions for patients with SCD and the use of Hydroxyurea as a treatment option.',
    authors: 'Dr. Jacob Pendergrast, Karen Fleming',
    image: `${GEN}/hf_20260725_030133_dbd38ad6-a122-4e3a-89d2-c35a5729ad5d.png`,
  },
  {
    number: 5,
    title: 'Common Complications in Sickle Cell Disease',
    topic: 'Complications',
    lessons: 5,
    description:
      'Five common complications in SCD and the best practices for managing them.',
    authors: 'Dr. Uma Athale, Karen Fleming, Dr. Meghna Dua, Dr. Suzan Williams',
    image: `${GEN}/hf_20260725_030136_4e3a83f4-9f8d-4f4a-b869-8e91447b06d5.png`,
  },
  {
    number: 6,
    title: 'Successful Transitions for Adolescents and Young Adults',
    topic: 'Transitions',
    lessons: 4,
    description:
      'Defining transitions, highlighting barriers faced by AYAs with SCD, and strategies to support them.',
    authors: 'James Bradley, Fairuz Karim, Jaspreet Randhawa, Karen Fleming',
    image: `${GEN}/hf_20260725_030139_4bcf3d6d-f33d-441f-895b-cbb4943a414b.png`,
  },
  {
    number: 7,
    title: 'Moving Towards Anti-Oppressive, Anti-Racist Healthcare',
    topic: 'Health Equity',
    lessons: 4,
    description:
      'Reflect on how power and privilege influence the healthcare of individuals with SCD.',
    authors: 'Dr. Ewurabena Simpson, Karen Fleming, Dr. Madeleine Verhovsek',
    image: `${GEN}/hf_20260725_030141_5b477aff-e92f-4569-abd4-9f47265fefdb.png`,
  },
  {
    number: 8,
    title: 'Sustainable Advocacy in Sickle Cell Disease',
    topic: 'Advocacy',
    lessons: 4,
    description:
      'The need for advocacy as a sustainable practice to improve the care of individuals with SCD.',
    authors: 'Stefan Branov, Lanre Tunji Ajayi, Karen Fleming, Dr. Sandra Newton',
    image: `${GEN}/hf_20260725_030159_f26c2507-ae30-4941-9427-f6d45a815615.png`,
  },
  {
    number: 9,
    title: 'Fertility, Contraception, and Pregnancy in SCD',
    topic: 'Reproductive Health',
    lessons: 4,
    description:
      'Fertility challenges and contraception options for individuals with Sickle Cell Disease.',
    authors: 'Dr. Nadine Shehata, Dr. Claire Jones, Karen Fleming',
    image: `${GEN}/hf_20260725_030202_21075a9f-317e-4dea-97ff-044022ccbf92.png`,
  },
  {
    number: 10,
    title: 'Mental Health and Wellness in SCD',
    topic: 'Mental Health',
    lessons: 3,
    description:
      'Definition of mental health, the impact of SCD on mental wellness, and strategies to support mental health.',
    authors: 'Sarah Rashid, Sinthu Srikanthan, Karen Fleming, Dr. Sandra Newton',
    image: `${GEN}/hf_20260725_030205_755b579f-3b87-4860-b5d6-fc71aa6e72c7.png`,
  },
  {
    number: 11,
    title: 'Latest Innovations in Sickle Cell Disease',
    topic: 'Innovation',
    lessons: 3,
    description:
      'Current and upcoming research studies for the treatment of Sickle Cell Disease.',
    authors: 'Dr. Kevin Kuo, Dr. Seethal Jacob, Dr. Sarah Patterson, Karen Fleming',
    image: `${GEN}/hf_20260725_030208_7e2100ec-8a9d-4a6d-b468-1376315a2cfb.png`,
  },
  {
    number: 12,
    title: 'Prevention of SCD and The Truth About Sickle Cell Trait',
    topic: 'Prevention',
    lessons: 2,
    description:
      'Importance of prevention counseling and information on the current state of gene therapy for SCD.',
    authors: 'Simone Griffith, Karen Fleming',
    image: `${GEN}/hf_20260725_030211_3e7d2df9-05a3-437c-b4b0-8f6dcfb24f1a.png`,
  },
  {
    number: 13,
    title: 'Partnering with Primary Care Providers',
    topic: 'Primary Care',
    lessons: 4,
    description:
      'Challenges PCPs face in caring for patients with SCD and strategies for effective collaboration.',
    authors: 'Karen Fleming',
    image: `${GEN}/hf_20260725_030214_a2974a8c-ea68-46e7-b831-fdc40b026bc7.png`,
  },
];

/** Total published micro-lessons across the program (derived, never hardcoded). */
export const SCAGO_TOTAL_LESSONS = SCAGO_MODULES.reduce(
  (sum, m) => sum + m.lessons,
  0
);

/** Mainpro+ credits available — one per module. */
export const SCAGO_TOTAL_CREDITS = SCAGO_MODULES.length;
