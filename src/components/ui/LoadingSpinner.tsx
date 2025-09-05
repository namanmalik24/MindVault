import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 24, 
  className = "text-sky-600" 
}) => {
  return (
    <Loader2 
      size={size} 
      className={`animate-spin ${className}`} 
    />
  );
};