import React from 'react';
import { User, Settings, Zap, Target, Brain, FileText, Calendar, Award, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotes } from '../hooks/useNotes';
import { useQuizzes } from '../hooks/useQuizzes';
import { useChatSessions } from '../hooks/useChatSessions';
import { useUserSettings } from '../hooks/useUserSettings';
import { getMemoryStrength } from '../lib/spacedRepetition';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const Profile: React.FC = () => {
  const { user, updateUserPassword } = useAuth();
  const { notes } = useNotes();
  const { quizzes } = useQuizzes();
  const { sessions } = useChatSessions();
  const { settings, updateSetting, loading: settingsLoading } = useUserSettings();

  // Password change state
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmNewPassword, setConfirmNewPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(false);

  // Calculate user statistics
  const averageQuizScore = React.useMemo(() => {
    if (quizzes.length === 0) return 0;
    const totalPercentage = quizzes.reduce((sum, quiz) => 
      sum + (quiz.score / quiz.total_questions * 100), 0
    );
    return Math.round(totalPercentage / quizzes.length);
  }, [quizzes]);

  const studyStreak = React.useMemo(() => {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(checkDate);
      nextDay.setDate(checkDate.getDate() + 1);
      
      const hasActivity = notes.some(note => {
        const noteDate = new Date(note.created_at);
        return noteDate >= checkDate && noteDate < nextDay;
      }) || quizzes.some(quiz => {
        const quizDate = new Date(quiz.created_at);
        return quizDate >= checkDate && quizDate < nextDay;
      });
      
      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  }, [notes, quizzes]);

  const averageMemoryStrength = React.useMemo(() => {
    const notesWithReviewData = notes.filter(note => note.review_data);
    if (notesWithReviewData.length === 0) return 0;

    const totalStrength = notesWithReviewData.reduce((sum, note) => {
      const strength = getMemoryStrength({
        easeFactor: note.review_data!.easeFactor,
        interval: note.review_data!.interval,
        repetitions: note.review_data!.repetitions,
        nextReview: new Date(note.review_data!.nextReview),
        lastReviewed: new Date(note.review_data!.lastReviewed)
      });
      return sum + strength;
    }, 0);

    return Math.round(totalStrength / notesWithReviewData.length);
  }, [notes]);

  const totalStudyTime = React.useMemo(() => {
    if (!settings) return 0;
    
    const noteTime = notes.length * settings.estimated_note_time_minutes;
    const quizTime = quizzes.reduce((sum, quiz) => 
      sum + quiz.total_questions * settings.estimated_quiz_question_time_minutes, 0
    );
    return Math.round((noteTime + quizTime) / 60); // Convert to hours
  }, [notes, quizzes, settings]);

  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown';

  const handleToggleSetting = async (key: keyof typeof settings, value: boolean) => {
    await updateSetting(key, value);
  };

  const handleUpdateEstimatedTime = async (key: keyof typeof settings, value: number) => {
    if (value > 0 && value <= 1440) { // Max 24 hours in minutes
      await updateSetting(key, value);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await updateUserPassword(newPassword);
      if (error) {
        toast.error(error.message || 'Failed to update password');
      } else {
        toast.success('Password updated successfully');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-sky-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user?.user_metadata?.full_name || 'User'}
            </h2>
            <p className="text-gray-600">{user?.email}</p>
            <p className="text-sm text-gray-500">Member since {joinDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{studyStreak}</p>
            <p className="text-sm text-gray-600">Day Streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{averageQuizScore}%</p>
            <p className="text-sm text-gray-600">Avg. Score</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FileText className="h-5 w-5 text-sky-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
            <p className="text-sm text-gray-600">Total Notes</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Brain className="h-5 w-5 text-cyan-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{averageMemoryStrength}%</p>
            <p className="text-sm text-gray-600">Memory Strength</p>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Statistics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-sky-500" />
                <span className="text-sm text-gray-700">Notes Created</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{notes.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-cyan-500" />
                <span className="text-sm text-gray-700">Quizzes Completed</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{quizzes.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-gray-700">Questions Answered</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {quizzes.reduce((sum, quiz) => sum + quiz.total_questions, 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-gray-700">Estimated Study Time</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{totalStudyTime}h</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Breakdown</h3>
          <div className="space-y-3">
            {(() => {
              const subjectCounts = notes.reduce((acc, note) => {
                const subject = note.subject || 'Uncategorized';
                acc[subject] = (acc[subject] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              const sortedSubjects = Object.entries(subjectCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);

              if (sortedSubjects.length === 0) {
                return (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No subjects yet. Add subjects to your notes to see breakdown.
                  </p>
                );
              }

              return sortedSubjects.map(([subject, count]) => (
                <div key={subject} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{subject}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-sky-600 h-2 rounded-full" 
                        style={{ width: `${(count / notes.length) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Study Time Settings */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Time Estimates</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure how much time you typically spend on different activities to get more accurate study time calculations.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time per Note (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={settings?.estimated_note_time_minutes || 15}
              onChange={(e) => handleUpdateEstimatedTime('estimated_note_time_minutes', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200"
            />
            <p className="text-xs text-gray-500 mt-1">
              Average time spent creating or reviewing a note
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time per Quiz Question (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings?.estimated_quiz_question_time_minutes || 2}
              onChange={(e) => handleUpdateEstimatedTime('estimated_quiz_question_time_minutes', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200"
            />
            <p className="text-xs text-gray-500 mt-1">
              Average time spent answering a quiz question
            </p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Lock className="h-5 w-5 mr-2" />
          Change Password
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Update your password to keep your account secure.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter new password"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 6 characters long
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200"
                placeholder="Confirm new password"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={handlePasswordChange}
            disabled={passwordLoading || !newPassword || !confirmNewPassword}
            className="bg-sky-600 text-white px-6 py-2 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {passwordLoading ? (
              <LoadingSpinner size={16} className="text-white" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span>Update Password</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Daily Review Reminders</p>
              <p className="text-sm text-gray-600">Get notified when it's time to review</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings?.daily_review_reminders_enabled || false}
                onChange={(e) => handleToggleSetting('daily_review_reminders_enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Auto-generate Quiz</p>
              <p className="text-sm text-gray-600">Automatically create quizzes from new notes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings?.auto_generate_quiz_enabled || false}
                onChange={(e) => handleToggleSetting('auto_generate_quiz_enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Smart Tagging</p>
              <p className="text-sm text-gray-600">Use AI to automatically tag your notes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings?.smart_tagging_enabled || false}
                onChange={(e) => handleToggleSetting('smart_tagging_enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};