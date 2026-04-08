import { createShapeId, type Editor } from 'tldraw';

/** Default canvas frame dimensions (16:9) */
export const CANVAS_FRAME = { width: 1920, height: 1080 } as const;

/** Device preview viewport widths */
export const DEVICE_VIEWPORTS = {
  desktop: 1920,
  tablet: 768,
  mobile: 375,
} as const;

export type DevicePreview = keyof typeof DEVICE_VIEWPORTS;

/**
 * Serialize the tldraw editor state to a JSON-safe snapshot.
 * Captures both document and session state via editor.getSnapshot().
 */
export function serializeCanvas(editor: Editor): Record<string, unknown> {
  const snapshot = editor.getSnapshot();
  return JSON.parse(JSON.stringify(snapshot));
}

/**
 * Load a previously saved canvas snapshot into the editor.
 */
export function loadCanvasSnapshot(
  editor: Editor,
  canvasData: Record<string, unknown>
): void {
  editor.loadSnapshot(
    canvasData as Parameters<typeof editor.loadSnapshot>[0]
  );
}

/**
 * Fit the camera to show all content, with padding.
 */
export function fitCanvasToContent(editor: Editor): void {
  editor.zoomToFit({ animation: { duration: 0 } });
}

/**
 * Create a locked, non-editable frame rectangle that marks the 16:9 design area.
 * Called once when a new canvas slide is created.
 */
export function createDesignFrame(editor: Editor): void {
  const frameId = createShapeId('design-frame');
  editor.createShape({
    id: frameId,
    type: 'geo',
    x: 0,
    y: 0,
    opacity: 0.5,
    props: {
      w: CANVAS_FRAME.width,
      h: CANVAS_FRAME.height,
      geo: 'rectangle',
      fill: 'solid',
      color: 'white',
      dash: 'dashed',
    },
  });
  editor.toggleLock([frameId]);
  editor.sendToBack([frameId]);
}
