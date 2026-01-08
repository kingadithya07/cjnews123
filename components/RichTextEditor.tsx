
import React, { useEffect, useRef, useState } from 'react';
import { 
  Bold, Italic, Underline, Heading1, Heading2, Quote, 
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Loader2,
  Trash2, Library, Palette, Indent, Outdent, Eraser, Paintbrush,
  Type, ChevronDown
} from 'lucide-react';
import ImageGalleryModal from './ImageGalleryModal';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImageUpload: (file: File) => Promise<string>;
  placeholder?: string;
  className?: string;
  userId?: string | null;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content = '', onChange, onImageUpload, placeholder, className, userId }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  
  useEffect(() => {
    if (editorRef.current) {
        const safeContent = content || '';
        if (editorRef.current.innerHTML !== safeContent) {
           if (safeContent === '' && editorRef.current.innerHTML === '<br>') return;
           editorRef.current.innerHTML = safeContent;
        }
    }
  }, [content]);

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    editorRef.current?.focus();
  };
  
  return (
    <>
      <ImageGalleryModal isOpen={showGallery} onClose={() => setShowGallery(false)} onSelectImage={url => { exec('insertImage', url); setShowGallery(false); }} userId={userId} />
      <div className={`relative flex flex-col border border-gray-300 rounded-lg bg-white ${className}`}>
        <div className="sticky top-0 z-[20] flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
          <button type="button" onMouseDown={e => { e.preventDefault(); exec('bold'); }} className="p-1.5 hover:bg-gray-200 rounded"><Bold size={16} /></button>
          <button type="button" onMouseDown={e => { e.preventDefault(); exec('italic'); }} className="p-1.5 hover:bg-gray-200 rounded"><Italic size={16} /></button>
          <button type="button" onMouseDown={e => { e.preventDefault(); exec('underline'); }} className="p-1.5 hover:bg-gray-200 rounded"><Underline size={16} /></button>
          <div className="h-4 w-[1px] bg-gray-300 mx-1" />
          <button type="button" onMouseDown={e => { e.preventDefault(); setShowGallery(true); }} className="p-1.5 hover:bg-gray-200 rounded text-news-accent" title="Media Library"><Library size={16} /></button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          onInput={() => editorRef.current && onChange(editorRef.current.innerHTML)}
          className="flex-1 p-4 outline-none prose prose-slate max-w-none min-h-[300px] font-serif text-gray-800"
          style={{ whiteSpace: 'pre-wrap' }}
        />
        {(!content || content === '') && !editorRef.current?.innerHTML && (
            <div className="absolute top-[60px] left-4 text-gray-300 pointer-events-none font-serif text-lg">{placeholder || 'Enter story details...'}</div>
        )}
      </div>
    </>
  );
};

export default RichTextEditor;
