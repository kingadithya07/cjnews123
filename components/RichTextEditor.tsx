
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
  userId?: string | null; // Pass userId for isolated gallery
}

const rgbToHex = (color: string) => {
    if (!color) return '#000000';
    if (color.startsWith('#')) return color;
    const rgb = color.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
        return "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
    }
    return '#000000';
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, onImageUpload, placeholder, className, userId }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [isFormatPainting, setIsFormatPainting] = useState(false);
  const [copiedStyle, setCopiedStyle] = useState<any>(null);
  
  // Format State
  const [activeFormats, setActiveFormats] = useState({
      bold: false,
      italic: false,
      underline: false,
      alignLeft: false,
      alignCenter: false,
      alignRight: false,
      alignJustify: false,
      color: '#000000',
      fontSize: 16
  });
  
  // Font Size Menu State
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  
  // Ref to track the last time the context menu was triggered
  const lastContextMenuTime = useRef<number>(0);

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
      
      const target = event.target as HTMLElement;
      if (!target.closest('[data-fontsize-menu]')) {
          setShowFontSizeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const updateActiveFormats = () => {
      if (!editorRef.current) return;
      
      // Basic Formatting
      const bold = document.queryCommandState('bold');
      const italic = document.queryCommandState('italic');
      const underline = document.queryCommandState('underline');
      const alignLeft = document.queryCommandState('justifyLeft');
      const alignCenter = document.queryCommandState('justifyCenter');
      const alignRight = document.queryCommandState('justifyRight');
      const alignJustify = document.queryCommandState('justifyFull');
      
      // Color
      const colorVal = document.queryCommandValue('foreColor');
      const color = rgbToHex(colorVal);

      // Font Size (Computed from Selection)
      let fontSize = 16;
      const selection = window.getSelection();
      if (selection && selection.anchorNode) {
          // If anchor is text node, look at parent. If element, look at it.
          const node = selection.anchorNode.nodeType === 3 
              ? selection.anchorNode.parentElement 
              : selection.anchorNode as HTMLElement;
          
          if (node) {
              // Ensure we are inside the editor
              if (editorRef.current.contains(node) || editorRef.current === node) {
                  const style = window.getComputedStyle(node);
                  const sizePx = style.fontSize; // e.g., "16px"
                  if (sizePx && sizePx.endsWith('px')) {
                      fontSize = parseInt(sizePx, 10);
                  }
              }
          }
      }

      setActiveFormats({
          bold, italic, underline, alignLeft, alignCenter, alignRight, alignJustify, color, fontSize
      });
  };

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
    updateActiveFormats();
  };
  
  const changeFontSize = (size: number) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      // Generate a unique marker string for this operation
      const marker = `fs-${Date.now()}`;
      
      // Apply the marker as a font family to wrap the selection
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('fontName', false, marker);
      document.execCommand('styleWithCSS', false, 'false');
      
      if (editorRef.current) {
          // Find all elements that had this marker applied
          // Matches font[face="marker"] or span[style*="font-family: marker"]
          const elements = editorRef.current.querySelectorAll(`[style*="${marker}"], font[face="${marker}"]`);
          
          elements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              
              // Remove the marker font-family
              if (htmlEl.tagName.toLowerCase() === 'font') {
                  htmlEl.removeAttribute('face');
              } else {
                  htmlEl.style.fontFamily = '';
              }
              
              // Apply the desired exact pixel size
              htmlEl.style.fontSize = `${size}px`;
              
              // Cleanup empty style attributes
              if (htmlEl.getAttribute('style') === '') {
                  htmlEl.removeAttribute('style');
              }
          });
          
          onChange(editorRef.current.innerHTML);
      }
      setShowFontSizeMenu(false);
      updateActiveFormats();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateActiveFormats();
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
         // Force apply the styles (don't toggle)
         const currentBold = document.queryCommandState('bold');
         const currentItalic = document.queryCommandState('italic');
         const currentUnderline = document.queryCommandState('underline');
         
         if (copiedStyle.bold !== currentBold) exec('bold');
         if (copiedStyle.italic !== currentItalic) exec('italic');
         if (copiedStyle.underline !== currentUnderline) exec('underline');
         if (copiedStyle.color) exec('foreColor', copiedStyle.color);
         
         setIsFormatPainting(false);
         setCopiedStyle(null);
    }
    updateActiveFormats();
  };

  const handleEditorKeyUp = () => {
      updateActiveFormats();
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

  const handleContextMenu = (e: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastContextMenuTime.current < 2000) {
          lastContextMenuTime.current = 0;
      } else {
          e.preventDefault();
          lastContextMenuTime.current = now;
      }
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
          userId={userId} 
      />
      <div ref={wrapperRef} className={`relative flex flex-col border border-gray-300 rounded-lg bg-white ${className}`}>
        
        {/* Toolbar */}
        <div className="sticky top-0 z-[20] flex flex-wrap items-center gap-x-1 gap-y-2 p-2 border-b border-gray-200 bg-gray-50 shadow-sm">
          
          <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1 shrink-0">
              <ToolbarButton icon={Undo} command="undo" title="Undo" />
              <ToolbarButton icon={Redo} command="redo" title="Redo" />
          </div>

          <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1 shrink-0 relative" data-fontsize-menu>
              {/* Font Size Dropdown Trigger - Displays current pixel size */}
              <button 
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setShowFontSizeMenu(!showFontSizeMenu); }}
                  className={`px-2 py-1.5 rounded transition-colors shrink-0 flex items-center gap-1.5 text-xs font-bold ${showFontSizeMenu ? 'bg-gray-200 text-black' : 'text-gray-600 hover:text-black hover:bg-gray-200 bg-white border border-gray-200'}`}
                  title="Font Size"
              >
                  <span>{activeFormats.fontSize}px</span>
                  <ChevronDown size={10} />
              </button>
              
              {/* Font Size Dropdown Menu */}
              {showFontSizeMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 flex flex-col w-20 py-1 max-h-60 overflow-y-auto">
                      {[12, 13, 14, 15, 16, 17, 18, 20, 24, 28, 32, 48].map(size => (
                          <button
                              key={size}
                              onMouseDown={(e) => { e.preventDefault(); changeFontSize(size); }}
                              className={`px-3 py-1.5 text-left hover:bg-gray-100 text-xs font-bold ${activeFormats.fontSize === size ? 'bg-news-gold/10 text-news-gold' : 'text-gray-700'}`}
                          >
                              {size}px
                          </button>
                      ))}
                  </div>
              )}

              <ToolbarButton icon={Bold} command="bold" title="Bold" active={activeFormats.bold} />
              <ToolbarButton icon={Italic} command="italic" title="Italic" active={activeFormats.italic} />
              <ToolbarButton icon={Underline} command="underline" title="Underline" active={activeFormats.underline} />
              
              {/* Color Picker with dynamic icon color */}
              <div className="relative flex items-center justify-center w-7 h-7 overflow-hidden rounded hover:bg-gray-200 transition-colors shrink-0 group">
                  <Palette size={16} style={{ color: activeFormats.color }} className="pointer-events-none absolute transition-colors" />
                  <input 
                    type="color" 
                    value={activeFormats.color} 
                    onChange={(e) => exec('foreColor', e.target.value)} 
                    className="opacity-0 w-full h-full cursor-pointer z-10" 
                    title="Text Color" 
                  />
              </div>
              
              <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormatPainterClick(); }} className={`p-1.5 rounded transition-colors shrink-0 ${isFormatPainting ? 'bg-news-accent text-white animate-pulse' : 'text-gray-500 hover:text-black hover:bg-gray-200'}`} title="Format Painter">
                  <Paintbrush size={16} />
              </button>
              <ToolbarButton icon={Eraser} command="removeFormat" title="Clear Formatting" />
          </div>

          <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1 shrink-0">
              <ToolbarButton icon={Heading1} command="formatBlock" value="H1" title="Headline 1" />
              <ToolbarButton icon={Heading2} command="formatBlock" value="H2" title="Headline 2" />
              <ToolbarButton icon={Quote} command="formatBlock" value="blockquote" title="Quote" />
          </div>

          <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1 shrink-0">
              <ToolbarButton icon={List} command="insertUnorderedList" title="Bullet List" />
              <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Numbered List" />
              <ToolbarButton icon={Indent} command="indent" title="Indent" />
              <ToolbarButton icon={Outdent} command="outdent" title="Outdent" />
          </div>

          <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1 shrink-0">
              <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Align Left" active={activeFormats.alignLeft} />
              <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Align Center" active={activeFormats.alignCenter} />
              <ToolbarButton icon={AlignRight} command="justifyRight" title="Align Right" active={activeFormats.alignRight} />
              <ToolbarButton icon={AlignJustify} command="justifyFull" title="Justify" active={activeFormats.alignJustify} />
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
          onKeyUp={handleEditorKeyUp}
          onContextMenu={handleContextMenu}
          suppressContentEditableWarning
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 p-4 outline-none prose prose-slate max-w-none min-h-[300px] font-serif text-gray-800 selection:bg-news-gold/30 selection:text-black"
          style={{ 
              whiteSpace: 'pre-wrap',
              userSelect: 'text',
              WebkitUserSelect: 'text',
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
