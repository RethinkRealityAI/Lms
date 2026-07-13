/**
 * Shared device-frame dimensions for the editor's device preview (`preview-panel.tsx`,
 * editable) and the Preview dialog's iframe (`embed-device-frame.tsx`, real viewer).
 * Both key off the SAME numbers so the editor's device shape matches the preview.
 *
 * Frames are sized by ASPECT RATIO, not a fixed height: the card fills the available
 * panel height and derives its width from the ratio, capped at a nominal logical width.
 * The cap keeps the width near the real device's CSS width (so the slide container
 * queries fire at the right breakpoints) and below the 30rem/480px mobile breakpoint.
 *
 *  • mobile → 9:16 (represents a 1080×1920 phone), capped at 390px CSS wide
 *  • tablet → 3:4 (portrait tablet), capped at 820px CSS wide
 */
export type FramedDevice = 'tablet' | 'mobile';

export interface DeviceFrameSpec {
  /** CSS `aspect-ratio` value for the framed viewport. */
  aspectRatio: string;
  /** CSS `max-width` — caps the derived width near the device's real CSS width. */
  maxWidth: string;
  /** Tailwind corner-radius class for the device bezel. */
  radius: string;
  /** Tailwind border-width class for the device bezel. */
  bezel: string;
}

export const DEVICE_FRAME: Record<FramedDevice, DeviceFrameSpec> = {
  tablet: { aspectRatio: '3 / 4', maxWidth: 'min(100%, 820px)', radius: 'rounded-[1.8rem]', bezel: 'border-[12px]' },
  mobile: { aspectRatio: '9 / 16', maxWidth: 'min(100%, 390px)', radius: 'rounded-[2.4rem]', bezel: 'border-[11px]' },
};

export function isFramedDevice(device: string): device is FramedDevice {
  return device === 'tablet' || device === 'mobile';
}
