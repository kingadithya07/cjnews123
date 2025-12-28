import React from 'react';

export interface LinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onNavigate: (path: string) => void;
  title?: string;
}

export const Link: React.FC<LinkProps> = ({ to, children, className, onClick, onNavigate, title }) => (
  <a 
    href={to} 
    title={title}
    onClick={(e) => { 
      e.preventDefault(); 
      onNavigate(to);
      if (onClick) onClick();
    }} 
    className={className}
  >
    {children}
  </a>
);

export default Link;