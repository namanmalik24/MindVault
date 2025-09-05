import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatInterface } from '../components/chat/ChatInterface';
import { useNotes } from '../hooks/useNotes';
import { useQuizzes } from '../hooks/useQuizzes';

export const Assistant: React.FC = () => {
  const { notes } = useNotes();
  const { quizzes } = useQuizzes();

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-gray-600 mt-1">
            Ask questions about your notes, get summaries, or discuss your learning topics
          </p>
        </div>
        <div className="p-3 bg-indigo-100 rounded-lg">
          <MessageSquare className="h-6 w-6 text-indigo-600" />
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1">
        <ChatInterface notes={notes} quizzes={quizzes} />
      </div>
    </div>
  );
};