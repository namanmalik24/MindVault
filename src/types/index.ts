export interface Note {
  id: string;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  subject: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  review_data?: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: string;
    lastReviewed: string;
  };
}

export interface Quiz {
  id: string;
  title: string;
  note_id: string;
  questions: QuizQuestion[];
  created_at: string;
  user_id: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export interface StoredQuiz {
  id: string;
  user_id: string;
  note_id: string;
  questions: QuizQuestion[];
  user_answers: number[];
  score: number;
  total_questions: number;
  created_at: string;
  is_deleted: boolean;
  note?: {
    title: string;
    subject: string;
  };
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  answers: number[];
  completed_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
}

export interface ChatMessage {
  id: string;
  session_id?: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  estimated_note_time_minutes: number;
  estimated_quiz_question_time_minutes: number;
  daily_review_reminders_enabled: boolean;
  auto_generate_quiz_enabled: boolean;
  smart_tagging_enabled: boolean;
  created_at: string;
  updated_at: string;
}