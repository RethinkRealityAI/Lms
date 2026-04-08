import {
  BaseBoxShapeUtil,
  HTMLContainer,
  type TLBaseShape,
  type TLResizeInfo,
  T,
  type RecordProps,
} from 'tldraw';
import { LmsShapeContent } from '../lms-shape-content';

type LmsQuizShapeProps = { w: number; h: number; blockId: string };
export type LmsQuizShape = TLBaseShape<'lms-quiz', LmsQuizShapeProps>;

declare module 'tldraw' {
  interface TLGlobalShapePropsMap {
    'lms-quiz': LmsQuizShapeProps;
  }
}

const MIN_W = 200;
const MIN_H = 150;

export class LmsQuizShapeUtil extends BaseBoxShapeUtil<LmsQuizShape> {
  static override type = 'lms-quiz' as const;

  static override props: RecordProps<LmsQuizShape> = {
    w: T.number,
    h: T.number,
    blockId: T.string,
  };

  override getDefaultProps(): LmsQuizShapeProps {
    return { w: 500, h: 400, blockId: '' };
  }

  override canResize(): boolean {
    return true;
  }

  override onResize(shape: LmsQuizShape, info: TLResizeInfo<LmsQuizShape>) {
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

  override component(shape: LmsQuizShape) {
    return (
      <HTMLContainer style={{ width: shape.props.w, height: shape.props.h, overflow: 'auto', pointerEvents: 'all' }}>
        <LmsShapeContent blockId={shape.props.blockId} width={shape.props.w} height={shape.props.h} />
      </HTMLContainer>
    );
  }

  override indicator(shape: LmsQuizShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
