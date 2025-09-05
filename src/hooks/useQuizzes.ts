import { useState, useEffect } from 'react';
import { StoredQuiz, QuizQuestion } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useQuizzes = () => {
  const [quizzes, setQuizzes] = useState<StoredQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchQuizzes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          note:notes(title, subject)
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quiz history');
    } finally {
      setLoading(false);
    }
  };

  const saveQuiz = async (
    noteId: string,
    questions: QuizQuestion[],
    userAnswers: number[],
    score: number
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .insert([
          {
            user_id: user.id,
            note_id: noteId,
            questions,
            user_answers: userAnswers,
            score,
            total_questions: questions.length,
            created_at: new Date().toISOString(),
          }
        ])
        .select(`
          *,
          note:notes(title, subject)
        `)
        .single();

      if (error) throw error;
      
      setQuizzes(prev => [data, ...prev]);
      toast.success('Quiz saved successfully');
      return data;
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error('Failed to save quiz');
    }
  };

  const getQuizById = async (quizId: string): Promise<StoredQuiz | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          note:notes(title, subject)
        `)
        .eq('id', quizId)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching quiz:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [user]);

  return {
    quizzes,
    loading,
    saveQuiz,
    getQuizById,
    refetch: fetchQuizzes
  };
};