/*
  # Fix RLS policy for quiz soft delete operations

  1. Policy Updates
    - Drop and recreate the UPDATE policy for quizzes table
    - Ensure the policy allows soft delete operations (updating is_deleted flag)
    - Maintain security by only allowing users to update their own quizzes

  2. Security
    - Users can only update quizzes where they are the owner (user_id matches)
    - The policy allows updating any column including is_deleted for soft deletes
*/

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own quizzes" ON quizzes;

-- Create a new UPDATE policy that properly handles soft deletes
CREATE POLICY "Users can update their own quizzes"
  ON quizzes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure the DELETE policy exists for hard deletes if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quizzes' 
    AND policyname = 'Users can delete their own quizzes'
  ) THEN
    CREATE POLICY "Users can delete their own quizzes"
      ON quizzes
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;