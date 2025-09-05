import React, { useState } from 'react';
import { Brain, Play, TrendingUp, Plus, Eye, Calendar, Award } from 'lucide-react';
import { QuizPlayer } from '../components/quiz/QuizPlayer';
import { QuizDetailModal } from '../components/quiz/QuizDetailModal';
import { useNotes } from '../hooks/useNotes';
import { useQuizzes } from '../hooks/useQuizzes';
import { generateQuiz } from '../lib/ai';
import { Quiz as QuizType, StoredQuiz } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export const Quiz: React.FC = () => {
  const { notes } = useNotes();
  const { quizzes, saveQuiz, loading: quizzesLoading } = useQuizzes();
  const [tempQuizzes, setTempQuizzes] = useState<QuizType[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<QuizType | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<StoredQuiz | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');

  const handleGenerateQuiz = async () => {
    if (!selectedNoteId) {
      toast.error('Please select a note to generate quiz from');
      return;
    }

    const selectedNote = notes.find(note => note.id === selectedNoteId);
    if (!selectedNote) return;

    setIsGenerating(true);
    try {
      const quizData = await generateQuiz(selectedNote.content, 5);
      
      if (quizData.questions && quizData.questions.length > 0) {
        const newQuiz: QuizType = {
          id: Date.now().toString(),
          title: `Quiz: ${selectedNote.title}`,
          note_id: selectedNote.id,
          questions: quizData.questions,
          created_at: new Date().toISOString(),
          user_id: 'current-user'
        };
        
        setTempQuizzes(prev => [newQuiz, ...prev]);
        toast.success('Quiz generated successfully!');
        setSelectedNoteId('');
      } else {
        toast.error('Failed to generate quiz questions');
      }
    } catch (error) {
      toast.error('Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuizComplete = async (score: number, answers: number[]) => {
    if (activeQuiz) {
      // Save quiz to database
      await saveQuiz(activeQuiz.note_id, activeQuiz.questions, answers, score);
      
      // Remove from temporary quizzes
      setTempQuizzes(prev => prev.filter(q => q.id !== activeQuiz.id));
      
      toast.success(`Quiz completed! Score: ${score}/${activeQuiz.questions.length}`);
    }
  };

  const averageScore = quizzes.length > 0 
    ? Math.round(quizzes.reduce((sum, quiz) => sum + (quiz.score / quiz.total_questions * 100), 0) / quizzes.length)
    : 0;

  const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.total_questions, 0);
  const totalCorrect = quizzes.reduce((sum, quiz) => sum + quiz.score, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Quiz Center</h1>
        <div className="p-3 bg-indigo-100 rounded-lg">
          <Brain className="h-6 w-6 text-indigo-600" />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('generate')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'generate'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Generate Quiz
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Quiz History ({quizzes.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'generate' ? (
            <div className="space-y-6">
              {/* Quiz Generation Controls */}
              <div className="flex items-center space-x-4">
                <select
                  value={selectedNoteId}
                  onChange={(e) => setSelectedNoteId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a note to generate quiz from...</option>
                  {notes.map(note => (
                    <option key={note.id} value={note.id}>{note.title}</option>
                  ))}
                </select>
                <button 
                  onClick={handleGenerateQuiz}
                  disabled={isGenerating || !selectedNoteId}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <LoadingSpinner size={16} className="text-white" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  <span>Generate Quiz</span>
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Available Quizzes</p>
                      <p className="text-2xl font-bold text-blue-900">{tempQuizzes.length}</p>
                    </div>
                    <Brain className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-700">Completed</p>
                      <p className="text-2xl font-bold text-emerald-900">{quizzes.length}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-600" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Notes Ready</p>
                      <p className="text-2xl font-bold text-purple-900">{notes.length}</p>
                    </div>
                    <Plus className="h-8 w-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700">Average Score</p>
                      <p className="text-2xl font-bold text-amber-900">{averageScore}%</p>
                    </div>
                    <Play className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
              </div>

              {/* Available Quizzes */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Quizzes</h2>
                
                {tempQuizzes.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes yet</h3>
                    <p className="text-gray-500 mb-4">
                      Generate your first quiz from your notes using AI
                    </p>
                    {notes.length === 0 ? (
                      <p className="text-sm text-gray-400">Create some notes first to generate quizzes</p>
                    ) : (
                      <p className="text-sm text-gray-400">Select a note above and click "Generate Quiz"</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tempQuizzes.map((quiz) => (
                      <div key={quiz.id} className="border border-gray-200 rounded-lg p-6 hover:border-indigo-300 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {quiz.questions.length} questions
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          AI-generated quiz based on your notes. Test your knowledge and improve retention.
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Created {new Date(quiz.created_at).toLocaleDateString()}
                          </span>
                          <button 
                            onClick={() => setActiveQuiz(quiz)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center space-x-2"
                          >
                            <Play className="h-4 w-4" />
                            <span>Start Quiz</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* History Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Total Quizzes</p>
                      <p className="text-2xl font-bold text-blue-900">{quizzes.length}</p>
                    </div>
                    <Brain className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-700">Average Score</p>
                      <p className="text-2xl font-bold text-emerald-900">{averageScore}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-600" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Questions Answered</p>
                      <p className="text-2xl font-bold text-purple-900">{totalQuestions}</p>
                    </div>
                    <Award className="h-8 w-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700">Correct Answers</p>
                      <p className="text-2xl font-bold text-amber-900">{totalCorrect}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
              </div>

              {/* Quiz History Table */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Quizzes</h2>

                {quizzesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size={32} />
                  </div>
                ) : quizzes.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No quiz history yet</h3>
                    <p className="text-gray-500 mb-4">
                      Complete some quizzes to see your history here
                    </p>
                    <button
                      onClick={() => setActiveTab('generate')}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Generate Your First Quiz
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Note
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Subject
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Score
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {quizzes.map((quiz) => {
                            const percentage = Math.round((quiz.score / quiz.total_questions) * 100);
                            
                            return (
                              <tr key={quiz.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {quiz.note?.title || 'Unknown Note'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {quiz.note?.subject && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                      {quiz.note.subject}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(quiz.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span className={`text-sm font-medium ${
                                      percentage >= 80 ? 'text-green-600' : 
                                      percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {quiz.score}/{quiz.total_questions}
                                    </span>
                                    <span className={`ml-2 text-xs ${
                                      percentage >= 80 ? 'text-green-500' : 
                                      percentage >= 60 ? 'text-yellow-500' : 'text-red-500'
                                    }`}>
                                      ({percentage}%)
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => setSelectedQuiz(quiz)}
                                    className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1 transition-colors"
                                  >
                                    <Eye className="h-4 w-4" />
                                    <span>View Details</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quiz Player Modal */}
      {activeQuiz && (
        <QuizPlayer
          quiz={activeQuiz}
          onComplete={handleQuizComplete}
          onClose={() => setActiveQuiz(null)}
        />
      )}

      {/* Quiz Detail Modal */}
      {selectedQuiz && (
        <QuizDetailModal
          quiz={selectedQuiz}
          onClose={() => setSelectedQuiz(null)}
        />
      )}
    </div>
  );
};