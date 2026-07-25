import { getTenantSlug } from '@/lib/tenant/server';
import { LandingPage } from '@/components/landing/landing-page';

/**
 * Public landing page — a SERVER component on purpose.
 *
 * The tenant used to be resolved inside a client component via
 * `resolveInstitutionSlug()`, which reads the `institution_slug` cookie. That
 * cookie does not exist during rendering on the server, so the prerendered HTML
 * was ALWAYS the default (GANSID) branch: visiting /scago shipped the GANSID
 * page, then React hydrated, found a different tree, threw a hydration error
 * and re-rendered the whole page on the client. Beyond the wasted render, it
 * meant crawlers and link previews for /scago saw GANSID's content.
 *
 * Resolving the slug here — from the request header the middleware stamps —
 * means the correct tenant's markup is in the first byte of HTML and the client
 * tree matches it exactly. Reading headers opts this route into per-request
 * rendering, which is correct: the response genuinely varies by tenant and must
 * not be cached as one shared static page.
 */
export default async function Home() {
  const institutionSlug = await getTenantSlug();
  return <LandingPage institutionSlug={institutionSlug} />;
}
