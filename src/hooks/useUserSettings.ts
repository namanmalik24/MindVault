import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

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

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSettings = async () => {
    if (!user) return;

    try {
      let { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No settings found, create default ones
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert([{ user_id: user.id }])
          .select()
          .single();

        if (insertError) throw insertError;
        data = newSettings;
      } else if (error) {
        throw error;
      }

      setSettings(data);
    } catch (error) {
      console.error('Error fetching user settings:', error);
      toast.error('Failed to load user settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user || !settings) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data);
      toast.success('Settings updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating user settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    return updateSettings({ [key]: value });
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  return {
    settings,
    loading,
    updateSettings,
    updateSetting,
    refetch: fetchSettings
  };
};