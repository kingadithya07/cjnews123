
import React, { useEffect, useRef, useState } from 'react';
import { 
  Bold, Italic, Underline, Heading1, Heading2, Quote, 
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Undo, Redo, Loader2,
  Trash2, Library, Palette, Indent, Outdent, Eraser, Paintbrush
} from 'lucide-react';
import ImageGalleryModal from './ImageGalleryModal';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImageUpload: (file: File) => Promise<string>;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, onImageUpload, placeholder, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [isFormatPainting, setIsFormatPainting] = useState(false);
  const [copiedStyle, setCopiedStyle] = useState<any>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
       if (content === '' && editorRef.current.innerHTML === '<br>') return;
       editorRef.current.innerHTML = content;
    }
  }, [content]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest('[data-image-delete-button]')) return;
        setSelectedImg(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };
  
  const handleGallerySelect = (url: string) => {
    if (editorRef.current) {
        editorRef.current.focus();
        exec('insertImage', url);
    }
    setShowGallery(false);
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
        setSelectedImg(target as HTMLImageElement);
    } else if (selectedImg) {
        setSelectedImg(null);
    }

    if (isFormatPainting && copiedStyle) {
        // Simple heuristic for format painting
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
             if (copiedStyle.bold) exec('bold');
             if (copiedStyle.italic) exec('italic');
             if (copiedStyle.underline) exec('underline');
             if (copiedStyle.color) exec('foreColor', copiedStyle.color);
             setIsFormatPainting(false);
             setCopiedStyle(null);
        }
    }
  };

  const handleFormatPainterClick = () => {
      if (!isFormatPainting) {
          const color = document.queryCommandValue('foreColor');
          const bold = document.queryCommandState('bold');
          const italic = document.queryCommandState('italic');
          const underline = document.queryCommandState('underline');
          
          setCopiedStyle({ color, bold, italic, underline });
          setIsFormatPainting(true);
      } else {
          setIsFormatPainting(false);
          setCopiedStyle(null);
      }
  };

  const handleDeleteImage = () => {
    if (selectedImg && editorRef.current) {
      selectedImg.remove();
      onChange(editorRef.current.innerHTML);
      setSelectedImg(null);
    }
  };

  const getButtonPosition = () => {
    if (!selectedImg || !wrapperRef.current) {
      return { display: 'none' };
    }
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const imgRect = selectedImg.getBoundingClientRect();
    
    const top = imgRect.top - wrapperRect.top;
    const left = imgRect.right - wrapperRect.left;
    
    return {
      position: 'absolute' as const,
      top: `${top}px`,
      left: `${left}px`,
      transform: 'translate(-50%, -50%)',
    };
  };

  const ToolbarButton = ({ icon: Icon, command, value, title, active }: any) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss from editor
        if (command === 'createLink') {
            const url = prompt('Enter link URL:');
            if (url) exec(command, url);
        } else {
            exec(command, value);
        }
      }}
      className={`p-1.5 rounded transition-colors shrink-0 ${active ? 'bg-news-black text-white' : 'text-gray-500 hover:text-black hover:bg-gray-200'}`}
      title={title}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <>
      <ImageGalleryModal
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          onSelectImage={handleGallerySelect}
      />
      <div ref={wrapperRef} className={`relative flex flex-col border border-gray-300 rounded-lg bg-white ${className}`}>
        
        {/* Toolbar - Sticky & Z-Index adjusted */}
        <div className="sticky top-0 z-[20] flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 overflow-x-auto no-scrollbar touch-pan-x shadow-sm">
          
          <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1 shrink-0">
              <ToolbarButton icon={Undo} command="undo" title="Undo" />
              <ToolbarButton icon={Redo} command="redo" title="Redo" />
          </div>

          <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1 shrink-0">
              <ToolbarButton icon={Bold} command="bold" title="Bold" />
              <ToolbarButton icon={Italic} command="italic" title="Italic" />
              <ToolbarButton icon={Underline} command="underline" title="Underline" />
              <div className="relative flex items-center justify-center w-7 h-7 overflow-hidden rounded hover:bg-gray-200 transition-colors shrink-0">
                  <Palette size={16} className="text-gray-500 pointer-events-none absolute" />
                  <input type="color" onChange={(e) => exec('foreColor', e.target.value)} className="opacity-0 w-full h-full cursor-pointer z-10" title="Text Color" />
              </div>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormatPainterClick(); }} className={`p-1.5 rounded transition-colors shrink-0 ${isFormatPainting ? 'bg-news-accent text-white animate-pulse' : 'text-gray-500 hover:text-black hover:bg-gray-200'}`} title="Format Painter">
                  <Paintbrush size={16} />
              </button>
              <ToolbarButton icon={Eraser} command="removeFormat" title="Clear Formatting" />
          </div>

          <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1 shrink-0">
              <ToolbarButton icon={Heading1} command="formatBlock" value="H2" title="Headline 1" />
              <ToolbarButton icon={Heading2} command="formatBlock" value="H3" title="Headline 2" />
              <ToolbarButton icon={Quote} command="formatBlock" value="blockquote" title="Quote" />
          </div>

          <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1 shrink-0">
              <ToolbarButton icon={List} command="insertUnorderedList" title="Bullet List" />
              <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Numbered List" />
              <ToolbarButton icon={Indent} command="indent" title="Indent" />
              <ToolbarButton icon={Outdent} command="outdent" title="Outdent" />
          </div>

          <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1 shrink-0">
              <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Align Left" />
              <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Align Center" />
              <ToolbarButton icon={AlignRight} command="justifyRight" title="Align Right" />
          </div>

          <div className="flex gap-0.5 shrink-0">
               <ToolbarButton icon={LinkIcon} command="createLink" title="Insert Link" />
              <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowGallery(true); }} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded transition-colors shrink-0" title="Gallery">
                  <Library size={16} />
              </button>
          </div>
        </div>

        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onClick={handleEditorClick}
          suppressContentEditableWarning
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 p-4 outline-none prose prose-lg max-w-none min-h-[300px] font-serif text-gray-800 selection:bg-news-gold/30 selection:text-black"
          style={{ 
              whiteSpace: 'pre-wrap',
              userSelect: 'text',
              WebkitUserSelect: 'text',
              // Allow standard touch interactions (pan/zoom) but restrict callout via standard logic if browser supports it
              touchAction: 'manipulation' 
          }}
        />
        
        {content === '' && !editorRef.current?.innerHTML && (
            <div className="absolute top-[60px] left-4 text-gray-300 pointer-events-none font-serif text-lg">
                {placeholder || 'Start writing...'}
            </div>
        )}

        {selectedImg && (
          <button
            type="button"
            data-image-delete-button
            onClick={handleDeleteImage}
            style={getButtonPosition()}
            className="z-20 p-1.5 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 focus:outline-none transition-transform hover:scale-110"
            title="Delete Image"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </>
  );
};

export default RichTextEditor;
