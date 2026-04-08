import {
  BaseBoxShapeUtil,
  HTMLContainer,
  type TLBaseShape,
  type TLResizeInfo,
  T,
  type RecordProps,
} from 'tldraw';

type LmsCalloutShapeProps = { w: number; h: number; blockId: string };
export type LmsCalloutShape = TLBaseShape<'lms-callout', LmsCalloutShapeProps>;

declare module 'tldraw' {
  interface TLGlobalShapePropsMap {
    'lms-callout': LmsCalloutShapeProps;
  }
}

const MIN_W = 150;
const MIN_H = 100;

export class LmsCalloutShapeUtil extends BaseBoxShapeUtil<LmsCalloutShape> {
  static override type = 'lms-callout' as const;

  static override props: RecordProps<LmsCalloutShape> = {
    w: T.number,
    h: T.number,
    blockId: T.string,
  };

  override getDefaultProps(): LmsCalloutShapeProps {
    return { w: 400, h: 200, blockId: '' };
  }

  override canResize(): boolean {
    return true;
  }

  override onResize(shape: LmsCalloutShape, info: TLResizeInfo<LmsCalloutShape>) {
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

  override component(shape: LmsCalloutShape) {
    return (
      <HTMLContainer>
        <div
          data-lms-block-id={shape.props.blockId}
          data-lms-block-type="callout"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fefce8',
            border: '2px dashed #ca8a04',
            borderRadius: 8,
            fontSize: 14,
            color: '#92400e',
            fontWeight: 600,
            pointerEvents: 'all',
          }}
        >
          Callout Block
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: LmsCalloutShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
