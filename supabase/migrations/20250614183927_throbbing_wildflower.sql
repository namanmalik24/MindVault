/*
  # Fix RLS policy for quiz deletion

  1. Policy Updates
    - Update the UPDATE policy for quizzes table to properly allow setting is_deleted = true
    - Ensure users can mark their own quizzes as deleted

  2. Security
    - Maintain security by ensuring users can only update their own quizzes
    - Allow the is_deleted field to be updated from false to true
*/

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own quizzes" ON quizzes;

-- Create a new UPDATE policy that allows users to update their own quizzes including the is_deleted field
CREATE POLICY "Users can update their own quizzes"
  ON quizzes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);