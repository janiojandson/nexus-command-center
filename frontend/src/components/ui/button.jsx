import React from 'react';

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-md',
    lg: 'px-6 py-3 text-lg rounded-md',
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}