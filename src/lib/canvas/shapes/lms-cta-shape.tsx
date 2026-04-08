import {
  BaseBoxShapeUtil,
  HTMLContainer,
  type TLBaseShape,
  type TLResizeInfo,
  T,
  type RecordProps,
} from 'tldraw';
import { LmsShapeContent } from '../lms-shape-content';

type LmsCtaShapeProps = { w: number; h: number; blockId: string };
export type LmsCtaShape = TLBaseShape<'lms-cta', LmsCtaShapeProps>;

declare module 'tldraw' {
  interface TLGlobalShapePropsMap {
    'lms-cta': LmsCtaShapeProps;
  }
}

const MIN_W = 150;
const MIN_H = 60;

export class LmsCtaShapeUtil extends BaseBoxShapeUtil<LmsCtaShape> {
  static override type = 'lms-cta' as const;

  static override props: RecordProps<LmsCtaShape> = {
    w: T.number,
    h: T.number,
    blockId: T.string,
  };

  override getDefaultProps(): LmsCtaShapeProps {
    return { w: 300, h: 120, blockId: '' };
  }

  override canResize(): boolean {
    return true;
  }

  override onResize(shape: LmsCtaShape, info: TLResizeInfo<LmsCtaShape>) {
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

  override component(shape: LmsCtaShape) {
    return (
      <HTMLContainer style={{ width: shape.props.w, height: shape.props.h, overflow: 'auto', pointerEvents: 'all' }}>
        <LmsShapeContent blockId={shape.props.blockId} width={shape.props.w} height={shape.props.h} />
      </HTMLContainer>
    );
  }

  override indicator(shape: LmsCtaShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
