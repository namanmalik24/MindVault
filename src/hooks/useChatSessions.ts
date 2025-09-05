import { useState, useEffect } from 'react';
import { ChatSession, ChatMessage } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useChatSessions = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSessions = async () => {
    if (!user) return;

    try {
      // Get sessions with message count and last message
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (sessionsError) throw sessionsError;

      // Get message counts and last messages for each session
      const sessionsWithDetails = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('content, role, created_at')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (messagesError) {
            console.error('Error fetching messages for session:', messagesError);
            return {
              ...session,
              message_count: 0,
              last_message: ''
            };
          }

          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          return {
            ...session,
            message_count: count || 0,
            last_message: messages?.[0]?.content || ''
          };
        })
      );

      setSessions(sessionsWithDetails);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (title: string = 'New Conversation'): Promise<ChatSession | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([
          {
            user_id: user.id,
            title,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      const newSession = { ...data, message_count: 0, last_message: '' };
      setSessions(prev => [newSession, ...prev.slice(0, 4)]); // Keep only 5 sessions
      return newSession;
    } catch (error) {
      console.error('Error creating chat session:', error);
      toast.error('Failed to create new conversation');
      return null;
    }
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ 
          title,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, title, updated_at: new Date().toISOString() }
          : session
      ));
    } catch (error) {
      console.error('Error updating session title:', error);
      toast.error('Failed to update conversation title');
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const getSessionMessages = async (sessionId: string): Promise<ChatMessage[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      return data?.map(msg => ({
        ...msg,
        timestamp: msg.created_at
      })) || [];
    } catch (error) {
      console.error('Error fetching session messages:', error);
      return [];
    }
  };

  const saveMessage = async (sessionId: string, content: string, role: 'user' | 'assistant'): Promise<ChatMessage | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            session_id: sessionId,
            user_id: user.id,
            content,
            role,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Update session's updated_at timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      // Update local sessions state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { 
              ...session, 
              updated_at: new Date().toISOString(),
              last_message: content,
              message_count: (session.message_count || 0) + 1
            }
          : session
      ));

      return {
        ...data,
        timestamp: data.created_at
      };
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  return {
    sessions,
    loading,
    createSession,
    updateSessionTitle,
    deleteSession,
    getSessionMessages,
    saveMessage,
    refetch: fetchSessions
  };
};