import {
  BaseBoxShapeUtil,
  HTMLContainer,
  type TLBaseShape,
  type TLResizeInfo,
  T,
  type RecordProps,
} from 'tldraw';
import { LmsShapeContent } from '../lms-shape-content';

type LmsVideoShapeProps = { w: number; h: number; blockId: string };
export type LmsVideoShape = TLBaseShape<'lms-video', LmsVideoShapeProps>;

declare module 'tldraw' {
  interface TLGlobalShapePropsMap {
    'lms-video': LmsVideoShapeProps;
  }
}

const MIN_W = 200;
const MIN_H = 120;

export class LmsVideoShapeUtil extends BaseBoxShapeUtil<LmsVideoShape> {
  static override type = 'lms-video' as const;

  static override props: RecordProps<LmsVideoShape> = {
    w: T.number,
    h: T.number,
    blockId: T.string,
  };

  override getDefaultProps(): LmsVideoShapeProps {
    return { w: 640, h: 360, blockId: '' };
  }

  override canResize(): boolean {
    return true;
  }

  override onResize(shape: LmsVideoShape, info: TLResizeInfo<LmsVideoShape>) {
    const result = super.onResize(shape, info);
    const props = result?.props ?? {};
    return {
      ...result,
      props: {
        ...props,
        w: Math.max(props.w ?? shape.props.w, MIN_W),
        h: Math.max(props.h ?? shape.props.h, MIN_H),
      },
    };
  }

  override component(shape: LmsVideoShape) {
    return (
      <HTMLContainer style={{ width: shape.props.w, height: shape.props.h, overflow: 'auto', pointerEvents: 'all' }}>
        <LmsShapeContent blockId={shape.props.blockId} width={shape.props.w} height={shape.props.h} />
      </HTMLContainer>
    );
  }

  override indicator(shape: LmsVideoShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
