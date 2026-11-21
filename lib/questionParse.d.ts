export type RawQuestion = {
  id: number;
  category: string;
  points: number;
  question: string;
  answer: string;
  hint: string;
  options: string[];
};

export function parseQuestionText(text: string): {
  questions: RawQuestion[];
  errors: string[];
};

export function strictBankErrors(questions: RawQuestion[]): string[];
