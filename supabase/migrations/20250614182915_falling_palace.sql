/*
  # Create quizzes table for persistent quiz storage

  1. New Tables
    - `quizzes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `note_id` (uuid, foreign key to notes)
      - `questions` (jsonb, stores quiz questions and options)
      - `user_answers` (jsonb, stores user's selected answers)
      - `score` (integer, number of correct answers)
      - `total_questions` (integer, total number of questions)
      - `created_at` (timestamp with timezone)
      - `is_deleted` (boolean, default false)

  2. Security
    - Enable RLS on `quizzes` table
    - Add policies for authenticated users to manage their own quizzes

  3. Performance
    - Add indexes on frequently queried columns
*/

-- Create the quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  questions jsonb NOT NULL,
  user_answers jsonb NOT NULL,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  is_deleted boolean DEFAULT false NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own quizzes"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_deleted = false);

CREATE POLICY "Users can insert their own quizzes"
  ON public.quizzes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes"
  ON public.quizzes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS quizzes_user_id_idx ON public.quizzes(user_id);
CREATE INDEX IF NOT EXISTS quizzes_note_id_idx ON public.quizzes(note_id);
CREATE INDEX IF NOT EXISTS quizzes_created_at_idx ON public.quizzes(created_at DESC);
CREATE INDEX IF NOT EXISTS quizzes_is_deleted_idx ON public.quizzes(is_deleted);