/*
  # Create notes table with spaced repetition support

  1. New Tables
    - `notes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text, required)
      - `content` (text, required)
      - `summary` (text, optional with default)
      - `tags` (text array, optional with default)
      - `subject` (text, optional with default)
      - `created_at` (timestamp with timezone, auto-generated)
      - `updated_at` (timestamp with timezone, auto-generated)
      - `review_data` (jsonb, for spaced repetition algorithm)

  2. Security
    - Enable RLS on `notes` table
    - Add policies for authenticated users to manage their own notes

  3. Performance
    - Add indexes on frequently queried columns
    - Add trigger for automatic updated_at timestamp updates
*/

-- Create the notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  summary text DEFAULT '',
  tags text[] DEFAULT '{}'::text[],
  subject text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  review_data jsonb
);

-- Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
  DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
  DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
  DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
END $$;

-- Create RLS policies
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON public.notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS notes_subject_idx ON public.notes(subject);
CREATE INDEX IF NOT EXISTS notes_tags_idx ON public.notes USING GIN(tags);

-- Create or replace the function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();