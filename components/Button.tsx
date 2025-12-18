import React from 'react';
import { LoaderIcon } from './Icons';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-suno-dark disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-suno-accent hover:bg-violet-600 text-white shadow-lg shadow-violet-900/20",
    secondary: "bg-suno-card hover:bg-gray-800 text-white border border-gray-700",
    ghost: "bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white"
  };

  const sizes = "px-4 py-3 text-sm sm:text-base";

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};