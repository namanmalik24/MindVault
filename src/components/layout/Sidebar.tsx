import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Brain, 
  MessageSquare, 
  User, 
  LogOut,
  BookOpen,
  Network
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotes } from '../../hooks/useNotes';
import { useQuizzes } from '../../hooks/useQuizzes';
import { useChatSessions } from '../../hooks/useChatSessions';
import toast from 'react-hot-toast';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Notes', href: '/notes', icon: FileText },
  { name: 'Quiz', href: '/quiz', icon: Brain },
  { name: 'Mind Map', href: '/mindmap', icon: Network },
  { name: 'Assistant', href: '/assistant', icon: MessageSquare },
  { name: 'Profile', href: '/profile', icon: User },
];

export const Sidebar: React.FC = () => {
  const { signOut, user } = useAuth();
  const { notes } = useNotes();
  const { quizzes } = useQuizzes();
  const { sessions } = useChatSessions();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const getItemCount = (href: string) => {
    switch (href) {
      case '/notes':
        return notes.length;
      case '/quiz':
        return quizzes.length;
      case '/assistant':
        return sessions.length;
      case '/mindmap':
        return notes.length;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col w-64 bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-sky-600 rounded-lg transform hover:scale-110 transition-transform duration-200">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">MindVault</span>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-sky-600">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const count = getItemCount(item.href);
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-all duration-200 transform hover:scale-105 ${
                  isActive
                    ? 'bg-sky-100 text-sky-700'
                    : 'text-gray-700 hover:bg-slate-100 hover:text-gray-900'
                }`
              }
            >
              <div className="flex items-center">
                <item.icon
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  aria-hidden="true"
                />
                {item.name}
              </div>
              {count !== null && count > 0 && (
                <span className="bg-slate-200 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                  {count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="px-4 py-4 border-t border-slate-200">
        <button
          onClick={handleSignOut}
          className="group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-slate-100 hover:text-gray-900 transition-all duration-200 transform hover:scale-105"
        >
          <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
          Sign out
        </button>
      </div>

      {/* Built with bolt.new branding */}
      <div className="px-4 py-2 border-t border-slate-200">
        <div className="text-xs text-gray-400 text-center opacity-60 hover:opacity-80 transition-opacity">
          Built with bolt.new
        </div>
      </div>
    </div>
  );
};