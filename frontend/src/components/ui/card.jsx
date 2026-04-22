import React from 'react';

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-lg border bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children }) {
  return (
    <div className="border-b border-gray-200 px-6 py-4">
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return (
    <h3 className="text-lg font-semibold leading-6 text-gray-900">
      {children}
    </h3>
  );
}

export function CardContent({ children }) {
  return (
    <div className="px-6 pb-6">
      {children}
    </div>
  );
}

export function CardFooter({ children }) {
  return (
    <div className="border-t border-gray-200 px-6 py-4">
      {children}
    </div>
  );
}