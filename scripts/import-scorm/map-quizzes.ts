interface GansidQuestion {
  slide: number;
  question: string;
  statement?: string;
  question_type: string;
  options: string[];
}

export interface MappedQuestion {
  question_type: string;
  question_text: string;
  question_data: Record<string, unknown>;
  correct_answer_data: Record<string, unknown>;
  points: number;
  order_index: number;
}

export function mapGansidQuestion(q: GansidQuestion, orderIndex: number): MappedQuestion {
  const base = {
    question_type: q.question_type,
    question_text: q.statement ? `${q.question} — ${q.statement}` : q.question,
    order_index: orderIndex,
    correct_answer_data: {} as Record<string, unknown>,
  };

  switch (q.question_type) {
    case 'multiple_choice':
      return { ...base, points: 1.0, question_data: { options: q.options } };

    case 'true_false':
      return {
        ...base,
        points: 1.0,
        question_data: { options: ['True', 'False'], statement: q.statement ?? '' },
      };

    case 'likert_scale':
      return {
        ...base,
        points: 0,
        question_data: { scale_labels: q.options, scale_size: q.options.length },
      };

    case 'open_text':
      return { ...base, points: 0, question_data: { max_words: 500 } };

    default:
      return { ...base, points: 1.0, question_data: { options: q.options } };
  }
}

export function mapGansidLesson(lessonData: {
  lesson_number: number;
  title: string;
  questions: GansidQuestion[];
}): MappedQuestion[] {
  return lessonData.questions.map((q, i) => mapGansidQuestion(q, i));
}
