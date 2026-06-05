# Responsive Image Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authors set image-block sizing (fit, max-height, gallery columns, width, alignment) per breakpoint (mobile/tablet/desktop) with a cascade so they only configure the exception, plus smart defaults so most images look good with zero overrides.

**Architecture:** Add an optional `responsive` overrides bucket to `image_gallery` data (desktop = existing base fields; tablet inherits desktop; mobile inherits tablet). A pure resolver computes the effective values per breakpoint (with smart defaults: mobile width=full, mobile columns=1, tablet columns=min(base,2)). The viewer renders via CSS custom properties driven by **container queries** on the existing `.slide-cq` container — one static consumer rule in `globals.css` + a per-block scoped `<style>` that sets the vars at each breakpoint. The editor exposes device-aware controls that read the resolved value and write to the active device's bucket, driven by the existing `devicePreview` state threaded through the store.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Zod, Tailwind v4 container queries, Vitest. Container `.slide-cq` (`container-name: slide`) already wraps both the editor canvas and the student viewer.

**Breakpoints (match existing CSS — globals.css uses 30rem for the mobile stack):**
- mobile: `< 30rem` (480px)
- tablet: `30rem – 47.99rem` (480–767px)
- desktop: `>= 48rem` (768px)

---

## File Structure

- **Create** `src/lib/content/blocks/image-gallery/responsive.ts` — types, the `resolveImageLayout()` cascade resolver, value maps (displaySize→rem, widthPreset→%, align→margins), and `buildImageResponsiveCss()` (scoped `<style>` text + class name).
- **Create** `src/lib/content/blocks/image-gallery/responsive.test.ts` — unit tests for the resolver + smart defaults.
- **Modify** `src/lib/content/blocks/image-gallery/schema.ts` — add `widthPreset`, `align`, and the `responsive` bucket.
- **Modify** `src/app/globals.css` — add the static consumer rules (`.lms-img-resp …`).
- **Modify** `src/components/blocks/image-gallery/viewer.tsx` — route rendering through the CSS-var system; inject the scoped `<style>`; default gallery columns auto-reduce.
- **Modify** `src/lib/content/block-registry.ts` — add optional `breakpoint?: 'mobile'|'tablet'|'desktop'` to `BlockEditorProps`.
- **Modify** `src/lib/stores/editor-store.ts` — add `devicePreview` + `setDevicePreview` to the store.
- **Modify** `src/components/editor/course-editor-shell.tsx` — back `devicePreview` with the store (keep current call sites working).
- **Modify** `src/components/editor/block-editor-panel.tsx` — read `devicePreview` from store, map to breakpoint, pass to `EditorComponent`.
- **Modify** `src/components/blocks/image-gallery/editor.tsx` — device-aware controls (fit, max-height, columns, width, align) with cascade-read / override-write + "Overridden · Reset" affordance.

---

## Task 1: Schema — responsive fields

**Files:**
- Modify: `src/lib/content/blocks/image-gallery/schema.ts`

- [ ] **Step 1: Add the new enums + fields to the schema**

In `schema.ts`, after `imageGalleryDisplaySizeSchema`, add:

```ts
export const imageWidthPresetSchema = z.enum(['full', 'lg', 'md', 'sm']);
export const imageAlignSchema = z.enum(['left', 'center', 'right']);

/** Per-breakpoint overridable sizing fields (all optional — absent = inherit). */
export const imageResponsiveOverrideSchema = z.object({
  objectFit: z.enum(['cover', 'contain']).optional(),
  displaySize: imageGalleryDisplaySizeSchema.optional(),
  columns: z.number().int().min(1).max(4).optional(),
  widthPreset: imageWidthPresetSchema.optional(),
  align: imageAlignSchema.optional(),
});
```

Inside `imageGalleryDataSchema` object (before the closing `})`), add:

```ts
  /** Desktop base: how wide the image/gallery is within its slide cell. */
  widthPreset: imageWidthPresetSchema.default('full').optional(),
  /** Desktop base: horizontal alignment when widthPreset < full. */
  align: imageAlignSchema.default('center').optional(),
  /** Per-breakpoint sizing overrides. Desktop = base fields above. */
  responsive: z.object({
    tablet: imageResponsiveOverrideSchema.optional(),
    mobile: imageResponsiveOverrideSchema.optional(),
  }).optional(),
```

At the bottom export the inferred types:

```ts
export type ImageWidthPreset = z.infer<typeof imageWidthPresetSchema>;
export type ImageAlign = z.infer<typeof imageAlignSchema>;
export type ImageResponsiveOverride = z.infer<typeof imageResponsiveOverrideSchema>;
```

- [ ] **Step 2: Typecheck**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 3: Commit**

```bash
git add src/lib/content/blocks/image-gallery/schema.ts
git commit -m "feat(image): add responsive sizing fields to schema"
```

---

## Task 2: Resolver + CSS builder (pure, unit-tested)

**Files:**
- Create: `src/lib/content/blocks/image-gallery/responsive.ts`
- Test: `src/lib/content/blocks/image-gallery/responsive.test.ts`

- [ ] **Step 1: Write the failing test**

Create `responsive.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveImageLayout, buildImageResponsiveCss } from './responsive';
import type { ImageGalleryData } from './schema';

const base = (over: Partial<ImageGalleryData> = {}): ImageGalleryData =>
  ({ images: [], mode: 'gallery', objectFit: 'contain', displaySize: 'lg', columns: 3, widthPreset: 'md', align: 'center', ...over } as ImageGalleryData);

describe('resolveImageLayout', () => {
  it('desktop uses base fields', () => {
    const r = resolveImageLayout(base(), 'desktop');
    expect(r).toMatchObject({ objectFit: 'contain', displaySize: 'lg', columns: 3, widthPreset: 'md', align: 'center' });
  });

  it('mobile smart defaults: full width + 1 column when not overridden', () => {
    const r = resolveImageLayout(base(), 'mobile');
    expect(r.widthPreset).toBe('full');
    expect(r.columns).toBe(1);
  });

  it('tablet smart default: columns clamp to min(base,2)', () => {
    expect(resolveImageLayout(base({ columns: 4 }), 'tablet').columns).toBe(2);
    expect(resolveImageLayout(base({ columns: 2 }), 'tablet').columns).toBe(2);
  });

  it('explicit override beats smart default and cascades into mobile', () => {
    const data = base({ responsive: { tablet: { objectFit: 'cover', columns: 3 }, mobile: { widthPreset: 'md' } } });
    const tablet = resolveImageLayout(data, 'tablet');
    expect(tablet.objectFit).toBe('cover');
    expect(tablet.columns).toBe(3);
    const mobile = resolveImageLayout(data, 'mobile');
    expect(mobile.objectFit).toBe('cover'); // inherited from tablet
    expect(mobile.widthPreset).toBe('md');  // explicit mobile override beats the full default
  });

  it('handles legacy data with missing base fields', () => {
    const r = resolveImageLayout({ images: [] } as unknown as ImageGalleryData, 'desktop');
    expect(r).toMatchObject({ objectFit: 'contain', displaySize: 'md', columns: 2, widthPreset: 'full', align: 'center' });
  });
});

describe('buildImageResponsiveCss', () => {
  it('emits a class name and scoped style with all three container-query tiers', () => {
    const { className, css } = buildImageResponsiveCss('blk-123', base());
    expect(className).toBe('lms-img-blk-123');
    expect(css).toContain('.lms-img-blk-123');
    expect(css).toContain('@container slide (max-width: 29.99rem)');
    expect(css).toContain('@container slide (min-width: 30rem) and (max-width: 47.99rem)');
    expect(css).toContain('--lms-img-cols');
  });

  it('sanitizes ids that arent valid class tokens', () => {
    const { className } = buildImageResponsiveCss('a/b 1', base());
    expect(className).toMatch(/^lms-img-[a-zA-Z0-9_-]+$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/lib/content/blocks/image-gallery/responsive.test.ts`
Expected: FAIL ("Cannot find module './responsive'")

- [ ] **Step 3: Implement `responsive.ts`**

```ts
import type {
  ImageAlign, ImageGalleryData, ImageGalleryDisplaySize, ImageWidthPreset,
} from './schema';

export type ImageBreakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ResolvedImageLayout {
  objectFit: 'cover' | 'contain';
  displaySize: ImageGalleryDisplaySize;
  columns: number;
  widthPreset: ImageWidthPreset;
  align: ImageAlign;
}

export const DISPLAY_SIZE_REM: Record<ImageGalleryDisplaySize, string> = {
  sm: '8rem', md: '12rem', lg: '16rem', xl: '20rem',
};
export const WIDTH_PRESET_PCT: Record<ImageWidthPreset, string> = {
  full: '100%', lg: '80%', md: '60%', sm: '40%',
};
function alignMargins(align: ImageAlign): { ml: string; mr: string } {
  if (align === 'left') return { ml: '0', mr: 'auto' };
  if (align === 'right') return { ml: 'auto', mr: '0' };
  return { ml: 'auto', mr: 'auto' };
}

function baseLayout(data: ImageGalleryData): ResolvedImageLayout {
  return {
    objectFit: data.objectFit ?? 'contain',
    displaySize: data.displaySize ?? 'md',
    columns: data.columns ?? 2,
    widthPreset: data.widthPreset ?? 'full',
    align: data.align ?? 'center',
  };
}

/**
 * Resolve the effective image layout for a breakpoint.
 * Cascade: desktop = base; tablet = base + tablet override; mobile = tablet + mobile override.
 * Smart defaults (when NOT explicitly overridden): mobile width=full & columns=1; tablet columns=min(base,2).
 */
export function resolveImageLayout(data: ImageGalleryData, bp: ImageBreakpoint): ResolvedImageLayout {
  const base = baseLayout(data);
  if (bp === 'desktop') return base;

  const tabletOv = data.responsive?.tablet ?? {};
  const tablet: ResolvedImageLayout = {
    objectFit: tabletOv.objectFit ?? base.objectFit,
    displaySize: tabletOv.displaySize ?? base.displaySize,
    columns: tabletOv.columns ?? Math.min(base.columns, 2),
    widthPreset: tabletOv.widthPreset ?? base.widthPreset,
    align: tabletOv.align ?? base.align,
  };
  if (bp === 'tablet') return tablet;

  const mobileOv = data.responsive?.mobile ?? {};
  return {
    objectFit: mobileOv.objectFit ?? tablet.objectFit,
    displaySize: mobileOv.displaySize ?? tablet.displaySize,
    columns: mobileOv.columns ?? 1,
    widthPreset: mobileOv.widthPreset ?? 'full',
    align: mobileOv.align ?? tablet.align,
  };
}

function varsFor(layout: ResolvedImageLayout): string {
  const m = alignMargins(layout.align);
  return [
    `--lms-img-fit: ${layout.objectFit};`,
    `--lms-img-maxh: ${DISPLAY_SIZE_REM[layout.displaySize]};`,
    `--lms-img-cols: ${layout.columns};`,
    `--lms-img-maxw: ${WIDTH_PRESET_PCT[layout.widthPreset]};`,
    `--lms-img-ml: ${m.ml};`,
    `--lms-img-mr: ${m.mr};`,
  ].join(' ');
}

export function imageBlockClassName(blockId: string): string {
  return 'lms-img-' + blockId.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/** Build the scoped <style> text that sets per-breakpoint CSS vars for one block. */
export function buildImageResponsiveCss(blockId: string, data: ImageGalleryData): { className: string; css: string } {
  const className = imageBlockClassName(blockId);
  const sel = '.' + className;
  const desktop = varsFor(resolveImageLayout(data, 'desktop'));
  const tablet = varsFor(resolveImageLayout(data, 'tablet'));
  const mobile = varsFor(resolveImageLayout(data, 'mobile'));
  const css = [
    `${sel} { ${desktop} }`,
    `@container slide (min-width: 30rem) and (max-width: 47.99rem) { ${sel} { ${tablet} } }`,
    `@container slide (max-width: 29.99rem) { ${sel} { ${mobile} } }`,
  ].join('\n');
  return { className, css };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node_modules/.bin/vitest run src/lib/content/blocks/image-gallery/responsive.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/blocks/image-gallery/responsive.ts src/lib/content/blocks/image-gallery/responsive.test.ts
git commit -m "feat(image): responsive layout resolver + scoped-CSS builder"
```

---

## Task 3: Static consumer CSS in globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append the consumer rules**

Add near the existing `.slide-cq` block in `globals.css`:

```css
/* Responsive image block: variables are set per-breakpoint by a scoped <style> the
   image viewer injects (see image-gallery/responsive.ts). These rules consume them. */
.lms-img-resp {
  max-width: var(--lms-img-maxw, 100%);
  margin-left: var(--lms-img-ml, auto);
  margin-right: var(--lms-img-mr, auto);
}
.lms-img-resp .lms-img-grid {
  display: grid;
  grid-template-columns: repeat(var(--lms-img-cols, 1), minmax(0, 1fr));
}
.lms-img-resp img.lms-img-el {
  object-fit: var(--lms-img-fit, contain);
  max-height: var(--lms-img-maxh, 12rem);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(image): consumer CSS for responsive image vars"
```

---

## Task 4: Viewer — render through the CSS-var system

**Files:**
- Modify: `src/components/blocks/image-gallery/viewer.tsx`

- [ ] **Step 1: Import the builder + class helper**

Replace the display-utils import line (currently importing `DISPLAY_SIZE_IMG_CLASS`) with:

```ts
import { loadViewedImageIndices, resolveCaptionColor, saveViewedImageIndices } from '@/lib/content/blocks/image-gallery/display-utils';
import { buildImageResponsiveCss } from '@/lib/content/blocks/image-gallery/responsive';
```

- [ ] **Step 2: Mark `<img>` elements and the gallery grid with the consumer classes**

In `ImageWithFallback`, add `lms-img-el` to the `<img>` className and DROP the `fitClass` (object-fit now comes from the CSS var). Change the `<img>` className to:

```tsx
        className={`${imgClassName ?? 'w-full h-full'} lms-img-el transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
```

Remove `fitClass` usage inside `ImageWithFallback` (keep the prop in the signature for now but unused, OR delete the prop and its pass-throughs — deleting is cleaner). Delete `fitClass` from `ImageWithFallback`, `BlockImage`, `SingleImageView`, `GalleryView`, `SliderView`, `CarouselView` signatures and call sites. Also remove the `const fitClass = …` line in the main component and stop passing it.

In `BlockImage`, the non-fixed-aspect `imgClassName` currently is `'w-full h-auto max-w-full mx-auto block'` plus `imgSizeClass`. Replace `imgSizeClass` (the old Tailwind max-h) usage everywhere with nothing — max-height now comes from `.lms-img-el { max-height: var(--lms-img-maxh) }`. So:
- Remove `imgSizeClass` from `InteractionConfig`, `BlockImage`, and all view components; remove `interaction.imgSizeClass`.
- In `BlockImage` non-fixed branch: `imgClassName={cn('w-full h-auto max-w-full mx-auto block lms-img-el')}` (the `lms-img-el` is already added inside ImageWithFallback; do not double-add — keep it only in ImageWithFallback).

In `GalleryView`, change the grid wrapper to use the consumer class instead of an inline `gridTemplateColumns`:

```tsx
  return (
    <div className="lms-img-grid gap-3">
      {images.map((img, i) => (
        // unchanged figure/children, but BlockImage no longer receives fitClass/imgSizeClass
      ))}
    </div>
  );
```

(Delete the `const cols = stacked ? 1 : columns;` and the inline `style`; `stacked`/`columns` props are no longer needed by GalleryView since columns now come from the CSS var. Remove them from its signature and call site.)

- [ ] **Step 3: Wrap the rendered body with the responsive class + inject the scoped style**

In the main `ImageGalleryViewer`, after computing `images`, build the CSS:

```ts
  const { className: respClass, css: respCss } = buildImageResponsiveCss(block.id, data);
```

Remove the old `sizeClass`/`DISPLAY_SIZE_IMG_CLASS` and `fitClass` lines. The `interaction` object loses `imgSizeClass`.

Change the final return so the body is wrapped:

```tsx
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: respCss }} />
      <div className={cn('lms-img-resp', respClass)}>
        {showPrompt && promptPosition === 'top' && <div className="mb-3">{promptEl}</div>}
        {imageBody}
        {showPrompt && promptPosition === 'bottom' && <div className="mt-3">{promptEl}</div>}
        {showProgress && (
          /* unchanged progress <p> */
        )}
      </div>
      {/* lightbox portals unchanged, OUTSIDE the wrapper */}
    </>
  );
```

(The lightbox `createPortal` elements must stay outside `.lms-img-resp` so the max-width does not constrain the full-screen overlay — they already render via `document.body` portals, so leaving them after the wrapper `<div>` is fine.)

- [ ] **Step 4: Typecheck + run existing tests**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `0`
Run: `node_modules/.bin/vitest run src/lib/content/blocks/image-gallery`
Expected: PASS

- [ ] **Step 5: Manual preview check (desktop/tablet/mobile)**

Use the running dev server (port 3001). Open a course with an image gallery in admin preview (`/gansid/admin/courses/<id>/preview`). Drive via the preview MCP `preview_eval`:
- Desktop: gallery shows base columns; image object-fit/max-height from base.
- Resize/iframe to tablet (≈600px): columns clamp to ≤2.
- Mobile (≈375px): single column, full width.
Confirm no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/blocks/image-gallery/viewer.tsx
git commit -m "feat(image): render image block via responsive CSS vars + scoped container queries"
```

---

## Task 5: Thread `devicePreview` to block editors

**Files:**
- Modify: `src/lib/content/block-registry.ts`
- Modify: `src/lib/stores/editor-store.ts`
- Modify: `src/components/editor/course-editor-shell.tsx`
- Modify: `src/components/editor/block-editor-panel.tsx`

- [ ] **Step 1: Add `breakpoint` to `BlockEditorProps`**

In `block-registry.ts`, inside `interface BlockEditorProps`, add:

```ts
  /** Active editor device preview, mapped to a responsive breakpoint. Defaults to 'desktop'. */
  breakpoint?: 'mobile' | 'tablet' | 'desktop';
```

- [ ] **Step 2: Add devicePreview to the editor store**

In `editor-store.ts`, add to the state interface and the store:

```ts
  // state
  devicePreview: 'desktop' | 'tablet' | 'mobile';
  // action
  setDevicePreview: (d: 'desktop' | 'tablet' | 'mobile') => void;
```

Initialize `devicePreview: 'desktop'` in the store's initial state and implement:

```ts
  setDevicePreview: (d) => set({ devicePreview: d }),
```

(Match the file's existing `set(...)` style — vanilla Zustand.)

- [ ] **Step 3: Back the shell's devicePreview with the store**

In `course-editor-shell.tsx`, replace the local `const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop');` with store-backed values:

```ts
  const devicePreview = useEditorStore((s) => s.devicePreview);
  const setDevicePreview = useEditorStore((s) => s.setDevicePreview);
```

Leave all existing usages (`devicePreview={devicePreview}`, `onDevicePreviewChange={setDevicePreview}`, `initialDevice={devicePreview}`) unchanged — the variable names are the same. Ensure `useEditorStore` is imported (it is used elsewhere in the shell; if not, import it).

- [ ] **Step 4: Pass breakpoint into the EditorComponent**

In `block-editor-panel.tsx`, read the device from the store and map it, then pass to the rendered `EditorComponent`:

```ts
  const devicePreview = useEditorStore((s) => s.devicePreview);
  const breakpoint = devicePreview === 'mobile' ? 'mobile' : devicePreview === 'tablet' ? 'tablet' : 'desktop';
```

At the `<EditorComponent … />` render site (around line 313), add the prop:

```tsx
        <EditorComponent
          /* existing props: data, block, onChange, slideBlockStyle */
          breakpoint={breakpoint}
        />
```

- [ ] **Step 5: Typecheck**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 6: Commit**

```bash
git add src/lib/content/block-registry.ts src/lib/stores/editor-store.ts src/components/editor/course-editor-shell.tsx src/components/editor/block-editor-panel.tsx
git commit -m "feat(editor): thread devicePreview/breakpoint to block editors via store"
```

---

## Task 6: Image editor — device-aware controls

**Files:**
- Modify: `src/components/blocks/image-gallery/editor.tsx`

- [ ] **Step 1: Add a cascade-aware read/write helper inside the editor**

At the top of `ImageGalleryEditor`, accept `breakpoint` from props and build helpers. The 5 responsive fields are: `objectFit`, `displaySize`, `columns`, `widthPreset`, `align`. Desktop writes the base field; tablet/mobile write `responsive[bp][field]`.

```tsx
import { resolveImageLayout } from '@/lib/content/blocks/image-gallery/responsive';
import type { ImageBreakpoint } from '@/lib/content/blocks/image-gallery/responsive';

const RESPONSIVE_FIELDS = ['objectFit', 'displaySize', 'columns', 'widthPreset', 'align'] as const;
type RespField = typeof RESPONSIVE_FIELDS[number];

export function ImageGalleryEditor({ data, onChange, slideBlockStyle, breakpoint = 'desktop' }: BlockEditorProps<ImageGalleryData>) {
  const bp = breakpoint as ImageBreakpoint;
  const resolved = resolveImageLayout(data, bp);

  // resolved effective value shown in the control for the active device
  const eff = <K extends RespField>(field: K): ResolvedImageLayout[K] => resolved[field];

  // does the active device have its OWN override (not inherited)?
  const isOverridden = (field: RespField): boolean =>
    bp !== 'desktop' && (data.responsive?.[bp] as Record<string, unknown> | undefined)?.[field] !== undefined;

  // write a value to the correct bucket for the active device
  function setResp<K extends RespField>(field: K, value: ResolvedImageLayout[K]) {
    if (bp === 'desktop') {
      onChange({ ...data, [field]: value });
      return;
    }
    const current = data.responsive ?? {};
    const tier = { ...(current[bp] ?? {}), [field]: value };
    onChange({ ...data, responsive: { ...current, [bp]: tier } });
  }

  // clear the active device's override for a field (revert to inherited)
  function clearResp(field: RespField) {
    if (bp === 'desktop' || !data.responsive?.[bp]) return;
    const tier = { ...(data.responsive[bp] as Record<string, unknown>) };
    delete tier[field];
    onChange({ ...data, responsive: { ...data.responsive, [bp]: tier } });
  }
```

Add the import for `ResolvedImageLayout`:
```ts
import type { ResolvedImageLayout } from '@/lib/content/blocks/image-gallery/responsive';
```

- [ ] **Step 2: Add a small device indicator + per-field override chip**

Add this helper component inside the file (module scope):

```tsx
function DeviceFieldNote({ bp, overridden, onReset }: { bp: ImageBreakpoint; overridden: boolean; onReset: () => void }) {
  if (bp === 'desktop') return null;
  return overridden ? (
    <button type="button" onClick={onReset} className="text-[10px] text-[#1E3A5F] underline mt-1">
      Overridden for {bp} · Reset to inherited
    </button>
  ) : (
    <p className="text-[10px] text-gray-400 mt-1">Inherited — change to set a {bp} override</p>
  );
}
```

At the very top of the returned JSX (inside the root `div`), add a device banner so authors know which device they are editing:

```tsx
      {bp !== 'desktop' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-700">
          Editing <strong>{bp}</strong> overrides. Switch the device toggle to Desktop to edit base values.
        </div>
      )}
```

- [ ] **Step 3: Rewire the 4 sizing controls to the device-aware helpers**

For **Image Fit** buttons: replace `data.objectFit` reads with `eff('objectFit')` and `onChange({...data, objectFit})` with `setResp('objectFit', opt.value)`. After the button row add:
```tsx
<DeviceFieldNote bp={bp} overridden={isOverridden('objectFit')} onReset={() => clearResp('objectFit')} />
```

For **Max Height** (displaySize): reads `eff('displaySize')`, writes `setResp('displaySize', size)`, add the `DeviceFieldNote` for `displaySize`.

For **Columns** (gallery grid section): reads `eff('columns')`, writes `setResp('columns', n)`; allow `[1,2,3,4]` now (mobile can be 1). Add `DeviceFieldNote` for `columns`. (Keep the existing `gridLayout` stacked/sideBySide control as-is — it is not per-breakpoint in v1.)

Add a **NEW "Image Width" control** in the Appearance section (after Max Height):

```tsx
        {/* Image width (per device) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Image Width</label>
          <div className="grid grid-cols-4 gap-1.5">
            {([
              { v: 'full', label: 'Full' }, { v: 'lg', label: 'Large' },
              { v: 'md', label: 'Medium' }, { v: 'sm', label: 'Small' },
            ] as const).map((opt) => (
              <button key={opt.v} type="button" onClick={() => setResp('widthPreset', opt.v)}
                className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                  eff('widthPreset') === opt.v ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
                }`}>{opt.label}</button>
            ))}
          </div>
          <DeviceFieldNote bp={bp} overridden={isOverridden('widthPreset')} onReset={() => clearResp('widthPreset')} />
        </div>

        {/* Alignment (only meaningful when width < full) */}
        {eff('widthPreset') !== 'full' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alignment</label>
            <div className="flex gap-1.5">
              {([
                { v: 'left', Icon: AlignLeft }, { v: 'center', Icon: AlignCenter }, { v: 'right', Icon: AlignRight },
              ] as const).map(({ v, Icon }) => (
                <button key={v} type="button" onClick={() => setResp('align', v)}
                  className={`flex-1 flex items-center justify-center px-2.5 py-1.5 rounded-lg border transition-colors ${
                    eff('align') === v ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
                  }`}><Icon className="w-3.5 h-3.5" /></button>
              ))}
            </div>
            <DeviceFieldNote bp={bp} overridden={isOverridden('align')} onReset={() => clearResp('align')} />
          </div>
        )}
```

(`AlignLeft`, `AlignRight`, `AlignCenter` are already imported in this file.)

- [ ] **Step 4: Typecheck**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 5: Manual end-to-end check**

Dev server on 3001. In the course editor: select an image block. With device = Desktop, set Width = Medium, Fit = Contain. Toggle device to Mobile — the Width control should show the inherited/effective value; set Fit = Cover (writes a mobile override; "Overridden for mobile · Reset" appears). Open preview at desktop vs mobile and confirm desktop = medium/contain, mobile = full/cover. Confirm Reset reverts.

- [ ] **Step 6: Commit**

```bash
git add src/components/blocks/image-gallery/editor.tsx
git commit -m "feat(image): device-aware sizing controls (fit/height/columns/width/align) with cascade + reset"
```

---

## Task 7: Final verification

- [ ] **Step 1: Full typecheck**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 2: Run image-gallery + resolver tests**

Run: `node_modules/.bin/vitest run src/lib/content/blocks/image-gallery`
Expected: PASS

- [ ] **Step 3: Regression check — existing galleries unchanged on desktop**

Open an existing course (e.g. a migrated GANSID module) in admin preview. Confirm existing image blocks (no `responsive` field, no `widthPreset`) still render correctly on desktop (full width, contain, prior columns) and now auto-reduce columns on mobile. No console errors.

- [ ] **Step 4: Commit any final touch-ups**

```bash
git add -A
git commit -m "chore(image): responsive image sizing — final verification"
```

---

## Notes / Guardrails

- **Backward compatible:** absent `responsive`/`widthPreset`/`align` → base resolves from existing fields; the only behavior change for legacy galleries is the smart **column auto-reduce on tablet/mobile** (an improvement). Desktop rendering is unchanged.
- **Scope:** image block only. The resolver + CSS-var pattern is generic and can be reused for other blocks later; do not wire other blocks in this plan.
- **Not in v1:** per-breakpoint react-grid-layout column span; tablet/mobile editing requires selecting the block on the desktop canvas first, then toggling device (selection persists in the store).
- **Container parity:** both editor canvas and student viewer render inside `.slide-cq`; the editor's tablet/mobile previews are width-constrained iframes — so the same container queries produce true device fidelity in all surfaces.
</content>
