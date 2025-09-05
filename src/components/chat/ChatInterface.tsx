import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, User, Plus, History, Trash2, Edit2 } from 'lucide-react';
import { chatWithAssistant } from '../../lib/ai';
import { ChatMessage, ChatSession, StoredQuiz } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useChatSessions } from '../../hooks/useChatSessions';

interface ChatInterfaceProps {
  notes?: any[];
  quizzes?: StoredQuiz[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ notes = [], quizzes = [] }) => {
  const {
    sessions,
    loading: sessionsLoading,
    createSession,
    updateSessionTitle,
    deleteSession,
    getSessionMessages,
    saveMessage
  } = useChatSessions();

  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with a default welcome message when no session is active
  useEffect(() => {
    if (!currentSession && !sessionsLoading) {
      setMessages([
        {
          id: 'welcome',
          content: "Hello! I'm your learning assistant. I can help you with questions about your notes, create summaries, or discuss topics you've been studying. What would you like to know?",
          role: 'assistant',
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ]);
    }
  }, [currentSession, sessionsLoading]);

  const handleStartNewConversation = async () => {
    const session = await createSession();
    if (session) {
      setCurrentSession(session);
      setMessages([
        {
          id: 'welcome-' + session.id,
          content: "Hello! I'm your learning assistant. I can help you with questions about your notes, create summaries, or discuss topics you've been studying. What would you like to know?",
          role: 'assistant',
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ]);
      setShowHistory(false);
    }
  };

  const handleLoadSession = async (session: ChatSession) => {
    setCurrentSession(session);
    const sessionMessages = await getSessionMessages(session.id);
    setMessages(sessionMessages);
    setShowHistory(false);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await deleteSession(sessionId);
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
    }
  };

  const handleEditSessionTitle = async (sessionId: string, newTitle: string) => {
    if (newTitle.trim()) {
      await updateSessionTitle(sessionId, newTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const generateSessionTitle = (firstMessage: string): string => {
    const words = firstMessage.split(' ').slice(0, 6);
    return words.join(' ') + (firstMessage.split(' ').length > 6 ? '...' : '');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    let sessionToUse = currentSession;
    
    // Create new session if none exists
    if (!sessionToUse) {
      const title = generateSessionTitle(inputMessage);
      sessionToUse = await createSession(title);
      if (!sessionToUse) return;
      setCurrentSession(sessionToUse);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      session_id: sessionToUse.id,
      content: inputMessage,
      role: 'user',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Save user message to database
    await saveMessage(sessionToUse.id, inputMessage, 'user');

    try {
      const response = await chatWithAssistant(inputMessage, notes, quizzes);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        session_id: sessionToUse.id,
        content: response,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message to database
      await saveMessage(sessionToUse.id, response, 'assistant');
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        session_id: sessionToUse.id,
        content: "I'm sorry, I encountered an error. Please try again.",
        role: 'assistant',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Chat History Sidebar */}
      <div className={`${showHistory ? 'w-80' : 'w-12'} transition-all duration-300 border-r border-gray-200 flex flex-col`}>
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
            title={showHistory ? 'Hide History' : 'Show History'}
          >
            <History className="h-5 w-5" />
          </button>
        </div>

        {showHistory && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              <button
                onClick={handleStartNewConversation}
                className="w-full flex items-center space-x-2 p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Chat</span>
              </button>
            </div>

            <div className="px-3 pb-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Conversations</h3>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                      currentSession?.id === session.id
                        ? 'bg-indigo-100 border border-indigo-200'
                        : 'hover:bg-gray-100 border border-transparent'
                    }`}
                    onClick={() => handleLoadSession(session)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {editingSessionId === session.id ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => handleEditSessionTitle(session.id, editingTitle)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleEditSessionTitle(session.id, editingTitle);
                              }
                            }}
                            className="w-full text-sm font-medium bg-transparent border-none outline-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {session.title}
                          </h4>
                        )}
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {session.last_message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(session.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSessionId(session.id);
                            setEditingTitle(session.title);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Edit title"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete conversation"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {sessions.length === 0 && !sessionsLoading && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No conversations yet
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentSession ? currentSession.title : 'AI Assistant'}
              </h2>
              <p className="text-sm text-gray-500">
                {currentSession 
                  ? `${currentSession.message_count || 0} messages`
                  : 'Start a new conversation'
                }
              </p>
            </div>
            {!currentSession && (
              <button
                onClick={handleStartNewConversation}
                className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.role === 'user' ? 'justify-end' : ''
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <MessageSquare className="h-4 w-4 text-indigo-600" />
                  </div>
                )}
                
                <div className={`flex-1 max-w-xs lg:max-w-md ${
                  message.role === 'user' ? 'order-first' : ''
                }`}>
                  <div className={`rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white ml-auto'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className={`text-xs text-gray-500 mt-1 ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}>
                    {message.role === 'user' ? 'You' : 'AI Assistant'} • {
                      new Date(message.timestamp).toLocaleTimeString()
                    }
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <LoadingSpinner size={16} className="text-indigo-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">AI Assistant is typing...</p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-4">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your notes..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};