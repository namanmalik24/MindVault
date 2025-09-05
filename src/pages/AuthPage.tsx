import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, User, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, signIn, signUp, resetPassword } = useAuth();

  // Check if Supabase is configured
  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Please set up your Supabase project credentials.');
      toast.error('Database connection not configured');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isForgotPassword) {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
          toast.error('Failed to send reset email');
        } else {
          toast.success('Password reset email sent! Check your inbox.');
          setIsForgotPassword(false);
          setEmail('');
        }
      } else if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
            setError('Invalid email or password. Please check your credentials or create an account if you don\'t have one yet.');
          } else if (error.message.includes('Email not confirmed')) {
            setError('Please check your email and click the confirmation link before signing in.');
          } else {
            setError(error.message);
          }
          toast.error('Sign in failed');
        } else {
          toast.success('Welcome back!');
        }
      } else {
        // Validate password confirmation
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          toast.error('Passwords do not match');
          return;
        }
        
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('An account with this email already exists. Please sign in instead.');
            setIsLogin(true);
          } else {
            setError(error.message);
          }
          toast.error('Sign up failed');
        } else {
          toast.success('Account created successfully! You can now sign in with your credentials.');
          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
          setFullName('');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('An unexpected error occurred. Please try again.');
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
  };

  const switchToForgotPassword = () => {
    setIsForgotPassword(true);
    setIsLogin(false);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
  };

  const switchToLogin = () => {
    setIsForgotPassword(false);
    setIsLogin(true);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-600 via-cyan-600 to-sky-800">
        <div className="flex flex-col justify-center px-12 text-white">
          <div className="flex items-center space-x-3 mb-8 transform hover:scale-105 transition-transform duration-200">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <BookOpen className="h-8 w-8" />
            </div>
            <span className="text-3xl font-bold">MindVault</span>
          </div>
          <h1 className="text-4xl font-bold mb-6">
            Your Personal Learning Memory Assistant
          </h1>
          <p className="text-xl text-sky-100 mb-8">
            Harness the power of spaced repetition and AI to supercharge your learning journey.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 transform hover:translate-x-2 transition-transform duration-200">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span className="text-sky-100">Smart note organization with AI tagging</span>
            </div>
            <div className="flex items-center space-x-3 transform hover:translate-x-2 transition-transform duration-200">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span className="text-sky-100">Personalized quiz generation</span>
            </div>
            <div className="flex items-center space-x-3 transform hover:translate-x-2 transition-transform duration-200">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span className="text-sky-100">Memory strength analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="text-center lg:hidden mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4 transform hover:scale-105 transition-transform duration-200">
              <div className="p-2 bg-sky-600 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">MindVault</span>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {isForgotPassword ? 'Reset your password' : isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isForgotPassword ? (
                <>
                  Remember your password?{' '}
                  <button
                    onClick={switchToLogin}
                    className="font-medium text-sky-600 hover:text-sky-500 transition-colors"
                  >
                    Sign in
                  </button>
                </>
              ) : isLogin ? (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={switchMode}
                    className="font-medium text-sky-600 hover:text-sky-500 transition-colors"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={switchMode}
                    className="font-medium text-sky-600 hover:text-sky-500 transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-amber-800">
                    <strong>Setup Required:</strong> Please configure your Supabase credentials in the .env file to enable authentication.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {!isLogin && !isForgotPassword && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required={!isLogin}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-all duration-200"
                      placeholder="Enter your full name"
                    />
                    <User className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-all duration-200"
                    placeholder="Enter your email"
                  />
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {!isForgotPassword && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-all duration-200"
                      placeholder="Enter your password"
                      minLength={6}
                    />
                    <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                  {!isLogin && (
                    <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters long</p>
                  )}
                </div>
              )}

              {!isLogin && !isForgotPassword && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-all duration-200"
                      placeholder="Confirm your password"
                      minLength={6}
                    />
                    <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              )}

              {isLogin && !isForgotPassword && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={switchToForgotPassword}
                    className="text-sm text-sky-600 hover:text-sky-500 transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading || !isSupabaseConfigured}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                >
                  {loading ? (
                    <LoadingSpinner size={20} className="text-white" />
                  ) : isForgotPassword ? (
                    'Send Reset Email'
                  ) : isLogin ? (
                    'Sign in'
                  ) : (
                    'Create account'
                  )}
                </button>
              </div>
            </form>

            {isForgotPassword && isSupabaseConfigured && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>Password Reset:</strong> Enter your email address and we'll send you a link to reset your password.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isLogin && !isForgotPassword && isSupabaseConfigured && (
              <div className="mt-6 p-4 bg-cyan-50 border border-cyan-200 rounded-md">
                <div className="flex">
                  <Info className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-cyan-800">
                      <strong>First time here?</strong> You'll need to create an account first by clicking "Sign up" above.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Built with bolt.new branding */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-400 opacity-60 hover:opacity-80 transition-opacity">
        Built with bolt.new
      </div>
    </div>
  );
};