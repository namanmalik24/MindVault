import React from 'react';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { StoredQuiz } from '../../types';

interface QuizDetailModalProps {
  quiz: StoredQuiz;
  onClose: () => void;
}

export const QuizDetailModal: React.FC<QuizDetailModalProps> = ({ quiz, onClose }) => {
  const percentage = Math.round((quiz.score / quiz.total_questions) * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quiz Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              {quiz.note?.title} • {new Date(quiz.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Score Summary */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Final Score</h3>
              <p className="text-sm text-gray-600">
                {quiz.note?.subject && (
                  <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs mr-2">
                    {quiz.note.subject}
                  </span>
                )}
                Completed on {new Date(quiz.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                percentage >= 80 ? 'text-green-600' : 
                percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {quiz.score}/{quiz.total_questions}
              </div>
              <div className={`text-sm ${
                percentage >= 80 ? 'text-green-600' : 
                percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {percentage}% correct
              </div>
            </div>
          </div>
        </div>

        {/* Questions and Answers */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {quiz.questions.map((question, questionIndex) => {
              const userAnswer = quiz.user_answers[questionIndex];
              const isCorrect = userAnswer === question.correct;
              const wasAnswered = userAnswer !== undefined && userAnswer !== null;

              return (
                <div key={questionIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium text-gray-900 flex-1">
                      {questionIndex + 1}. {question.question}
                    </h4>
                    <div className="ml-4">
                      {!wasAnswered ? (
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                      ) : isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isCorrectAnswer = optionIndex === question.correct;
                      const isUserAnswer = optionIndex === userAnswer;
                      
                      let className = "p-3 rounded-lg border ";
                      
                      if (isCorrectAnswer) {
                        className += "border-green-200 bg-green-50 text-green-800";
                      } else if (isUserAnswer && !isCorrect) {
                        className += "border-red-200 bg-red-50 text-red-800";
                      } else {
                        className += "border-gray-200 bg-gray-50 text-gray-700";
                      }

                      return (
                        <div key={optionIndex} className={className}>
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            <div className="flex items-center space-x-2">
                              {isCorrectAnswer && (
                                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                  Correct
                                </span>
                              )}
                              {isUserAnswer && !isCorrect && (
                                <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                  Your Answer
                                </span>
                              )}
                              {isUserAnswer && isCorrect && (
                                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                  Your Answer ✓
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!wasAnswered && (
                    <div className="mt-3 p-2 bg-gray-100 rounded text-sm text-gray-600 text-center">
                      Unanswered
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};