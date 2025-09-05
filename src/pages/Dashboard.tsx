import React from 'react';
import { 
  Brain, 
  FileText, 
  TrendingUp, 
  Calendar,
  Award,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useNotes } from '../hooks/useNotes';
import { useQuizzes } from '../hooks/useQuizzes';
import { useChatSessions } from '../hooks/useChatSessions';
import { useUserSettings } from '../hooks/useUserSettings';
import { getMemoryStrength } from '../lib/spacedRepetition';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const COLORS = ['#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export const Dashboard: React.FC = () => {
  const { notes, loading: notesLoading } = useNotes();
  const { quizzes, loading: quizzesLoading } = useQuizzes();
  const { sessions, loading: sessionsLoading } = useChatSessions();
  const { settings, loading: settingsLoading } = useUserSettings();

  const loading = notesLoading || quizzesLoading || sessionsLoading || settingsLoading;

  // Calculate memory strength data over time
  const memoryStrengthData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const notesWithReviewData = notes.filter(note => 
        note.review_data && new Date(note.updated_at).toISOString().split('T')[0] <= date
      );
      
      const avgStrength = notesWithReviewData.length > 0
        ? Math.round(
            notesWithReviewData.reduce((sum, note) => {
              if (note.review_data) {
                const strength = getMemoryStrength({
                  easeFactor: note.review_data.easeFactor,
                  interval: note.review_data.interval,
                  repetitions: note.review_data.repetitions,
                  nextReview: new Date(note.review_data.nextReview),
                  lastReviewed: new Date(note.review_data.lastReviewed)
                });
                return sum + strength;
              }
              return sum;
            }, 0) / notesWithReviewData.length
          )
        : 0;

      return {
        date,
        strength: avgStrength
      };
    });
  }, [notes]);

  // Calculate subject distribution
  const subjectData = React.useMemo(() => {
    const subjectCounts = notes.reduce((acc, note) => {
      const subject = note.subject || 'Uncategorized';
      acc[subject] = (acc[subject] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = notes.length;
    return Object.entries(subjectCounts)
      .map(([name, count], index) => ({
        name,
        value: total > 0 ? Math.round((count / total) * 100) : 0,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [notes]);

  // Calculate study session data using user settings
  const studySessionData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    const noteTimeMinutes = settings?.estimated_note_time_minutes || 15;
    const quizQuestionTimeMinutes = settings?.estimated_quiz_question_time_minutes || 2;

    return last7Days.map(date => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayQuizzes = quizzes.filter(quiz => {
        const quizDate = new Date(quiz.created_at);
        return quizDate >= dayStart && quizDate <= dayEnd;
      });

      const dayNotes = notes.filter(note => {
        const noteDate = new Date(note.created_at);
        return noteDate >= dayStart && noteDate <= dayEnd;
      });

      const sessions = dayQuizzes.length + Math.ceil(dayNotes.length / 2);
      const duration = (dayNotes.length * noteTimeMinutes) + 
                     (dayQuizzes.reduce((sum, quiz) => sum + quiz.total_questions, 0) * quizQuestionTimeMinutes);

      return {
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        sessions,
        duration: Math.round(duration)
      };
    });
  }, [notes, quizzes, settings]);

  // Calculate recent notes with memory strength
  const recentNotes = React.useMemo(() => {
    return notes
      .slice(0, 4)
      .map(note => {
        const strength = note.review_data ? getMemoryStrength({
          easeFactor: note.review_data.easeFactor,
          interval: note.review_data.interval,
          repetitions: note.review_data.repetitions,
          nextReview: new Date(note.review_data.nextReview),
          lastReviewed: new Date(note.review_data.lastReviewed)
        }) : null;

        return {
          id: note.id,
          title: note.title,
          subject: note.subject || 'General',
          lastReviewed: new Date(note.updated_at).toLocaleDateString(),
          strength
        };
      });
  }, [notes]);

  // Calculate upcoming reviews
  const upcomingReviews = React.useMemo(() => {
    const now = new Date();
    const notesWithReviews = notes
      .filter(note => note.review_data)
      .map(note => {
        const nextReview = new Date(note.review_data!.nextReview);
        const timeDiff = nextReview.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        let dueIn = '';
        let priority: 'high' | 'medium' | 'low' = 'low';
        
        if (daysDiff < 0) {
          dueIn = 'Overdue';
          priority = 'high';
        } else if (daysDiff === 0) {
          dueIn = 'Today';
          priority = 'high';
        } else if (daysDiff === 1) {
          dueIn = 'Tomorrow';
          priority = 'medium';
        } else {
          dueIn = `${daysDiff} days`;
          priority = daysDiff <= 3 ? 'medium' : 'low';
        }

        return {
          id: note.id,
          title: note.title,
          dueIn,
          priority
        };
      })
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 4);

    return notesWithReviews;
  }, [notes]);

  // Calculate stats
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

  const studyStreak = React.useMemo(() => {
    // Calculate study streak based on recent activity
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

  const dueReviewsCount = upcomingReviews.filter(review => 
    review.dueIn === 'Overdue' || review.dueIn === 'Today'
  ).length;

  const highPriorityReviews = upcomingReviews.filter(review => 
    review.priority === 'high'
  ).length;

  const averageQuizScore = React.useMemo(() => {
    if (quizzes.length === 0) return 0;
    const totalPercentage = quizzes.reduce((sum, quiz) => 
      sum + (quiz.score / quiz.total_questions * 100), 0
    );
    return Math.round(totalPercentage / quizzes.length);
  }, [quizzes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-cyan-600 rounded-lg px-6 py-8 text-white transform hover:scale-105 transition-transform duration-200">
        <h1 className="text-3xl font-bold mb-2">Welcome back to MindVault!</h1>
        <p className="text-sky-100">Track your learning progress and optimize your memory retention</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Notes</p>
              <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
            </div>
            <div className="p-3 bg-sky-100 rounded-lg">
              <FileText className="h-6 w-6 text-sky-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-600 font-medium">
              {notes.filter(note => {
                const noteDate = new Date(note.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return noteDate >= weekAgo;
              }).length} this week
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Memory Strength</p>
              <p className="text-2xl font-bold text-gray-900">
                {averageMemoryStrength > 0 ? `${averageMemoryStrength}%` : 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-cyan-100 rounded-lg">
              <Brain className="h-6 w-6 text-cyan-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-600 font-medium">
              {averageQuizScore}% avg quiz score
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Study Streak</p>
              <p className="text-2xl font-bold text-gray-900">{studyStreak} days</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <Award className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Zap className="h-4 w-4 text-amber-500 mr-1" />
            <span className="text-amber-600 font-medium">
              {studyStreak > 0 ? 'Keep it up!' : 'Start today!'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Due Reviews</p>
              <p className="text-2xl font-bold text-gray-900">{dueReviewsCount}</p>
            </div>
            <div className="p-3 bg-rose-100 rounded-lg">
              <Clock className="h-6 w-6 text-rose-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Target className="h-4 w-4 text-blue-500 mr-1" />
            <span className="text-blue-600 font-medium">
              {highPriorityReviews} high priority
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Strength Over Time */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Strength Trend</h3>
          {memoryStrengthData.some(d => d.strength > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={memoryStrengthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [`${value}%`, 'Memory Strength']}
                />
                <Area
                  type="monotone"
                  dataKey="strength"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <div className="text-center">
                <Brain className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No memory data yet</p>
                <p className="text-sm">Complete some quizzes to see trends</p>
              </div>
            </div>
          )}
        </div>

        {/* Subject Distribution */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Distribution</h3>
          {subjectData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={subjectData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {subjectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {subjectData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No subjects yet</p>
                <p className="text-sm">Add subjects to your notes to see distribution</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Study Sessions */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Study Activity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={studySessionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sessions" fill="#0ea5e9" name="Sessions" />
            <Bar dataKey="duration" fill="#10b981" name="Duration (min)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity and Upcoming Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notes */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notes</h3>
          {recentNotes.length > 0 ? (
            <div className="space-y-4">
              {recentNotes.map((note) => (
                <div key={note.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors transform hover:scale-105 duration-200">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{note.title}</h4>
                    <p className="text-sm text-gray-500">{note.subject} • {note.lastReviewed}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        note.strength === null ? 'text-gray-400' :
                        note.strength >= 80 ? 'text-emerald-600' : 
                        note.strength >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {note.strength === null ? 'N/A' : `${note.strength}%`}
                      </div>
                      <div className="text-xs text-gray-400">strength</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      note.strength === null ? 'bg-gray-300' :
                      note.strength >= 80 ? 'bg-emerald-500' : 
                      note.strength >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No notes yet</p>
              <p className="text-sm">Create your first note to get started</p>
            </div>
          )}
        </div>

        {/* Upcoming Reviews */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Reviews</h3>
          {upcomingReviews.length > 0 ? (
            <div className="space-y-4">
              {upcomingReviews.map((review) => (
                <div key={review.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors transform hover:scale-105 duration-200">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{review.title}</h4>
                    <p className="text-sm text-gray-500">Due {review.dueIn}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      review.priority === 'high' ? 'bg-red-100 text-red-800' :
                      review.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {review.priority}
                    </span>
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No reviews scheduled</p>
              <p className="text-sm">Complete some quizzes to enable spaced repetition</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};