
import React, { useState, useEffect, useRef } from 'react';
import { Copy, ExternalLink, Share2 } from 'lucide-react';

export interface LinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onNavigate: (path: string) => void;
  title?: string;
}

export const Link: React.FC<LinkProps> = ({ to, children, className, onClick, onNavigate, title }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [justCopied, setJustCopied] = useState(false);
  const isSharing = useRef(false);

  // Determine correct href for hash routing
  const href = to.startsWith('#') || to.startsWith('http') ? to : `#${to}`;
  const fullUrl = to.startsWith('http') ? to : `${window.location.origin}${window.location.pathname}${href}`;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
        setJustCopied(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', () => setContextMenu(null));
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', () => setContextMenu(null));
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    // Only show custom menu for internal app links, not random generic clicks
    if (!to.startsWith('http')) {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
        setJustCopied(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl).then(() => {
        setJustCopied(true);
        setTimeout(() => setContextMenu(null), 1000);
    });
  };

  const handleOpenNewTab = () => {
    window.open(href, '_blank');
    setContextMenu(null);
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    if (isSharing.current) return;
    
    isSharing.current = true;
    try {
        await navigator.share({ title: 'Check this out', url: fullUrl });
        setContextMenu(null);
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            console.error('Share failed', err);
        }
    } finally {
        isSharing.current = false;
    }
  };

  return (
    <>
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
        onContextMenu={handleContextMenu}
        className={className}
      >
        {children}
      </a>

      {contextMenu && (
        <div 
          ref={menuRef}
          className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {justCopied ? (
             <div className="px-4 py-2 text-xs font-bold text-green-600 flex items-center gap-2">
                 Link Copied!
             </div>
          ) : (
             <>
                <button onClick={handleCopyLink} className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-news-black flex items-center gap-2 transition-colors">
                    <Copy size={14} /> Copy Link Address
                </button>
                <button onClick={handleOpenNewTab} className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-news-black flex items-center gap-2 transition-colors">
                    <ExternalLink size={14} /> Open in New Tab
                </button>
                {navigator.share && (
                    <button onClick={handleShare} className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-news-black flex items-center gap-2 transition-colors">
                        <Share2 size={14} /> Share via...
                    </button>
                )}
             </>
          )}
        </div>
      )}
    </>
  );
};

export default Link;
