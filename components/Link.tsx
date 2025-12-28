
import React from 'react';

export interface LinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onNavigate: (path: string) => void;
  title?: string;
}

export const Link: React.FC<LinkProps> = ({ to, children, className, onClick, onNavigate, title }) => {
  // Determine correct href for hash routing
  // If 'to' is '#' or external, leave it. Otherwise prepend '#' if missing.
  const href = to.startsWith('#') || to.startsWith('http') ? to : `#${to}`;

  return (
    <a 
      href={href} 
      title={title}
      onClick={(e) => { 
        if (!to.startsWith('http')) {
            e.preventDefault(); 
            onNavigate(to);
            if (onClick) onClick();
        }
      }} 
      className={className}
    >
      {children}
    </a>
  );
};

export default Link;
