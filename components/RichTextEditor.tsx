import React, { useEffect, useRef } from 'react';
import { 
  Bold, Italic, Underline, Heading1, Heading2, Quote, 
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Undo, Redo
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, placeholder, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync content updates from parent only if editor is empty or significantly different
  // to avoid cursor jumping issues during typing
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
       // Only update if the content is truly different (e.g. loading a saved draft)
       // This checks prevents loop where typing updates state -> state updates innerHTML -> cursor moves to start
       if (content === '' && editorRef.current.innerHTML === '<br>') return;
       editorRef.current.innerHTML = content;
    }
  }, [content]);

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

  const ToolbarButton = ({ icon: Icon, command, value, title }: any) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss
        if (command === 'createLink') {
            const url = prompt('Enter link URL:');
            if (url) exec(command, url);
        } else if (command === 'insertImage') {
            const url = prompt('Enter image URL:');
            if (url) exec(command, url);
        } else {
            exec(command, value);
        }
      }}
      className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded transition-colors"
      title={title}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className={`flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1">
            <ToolbarButton icon={Bold} command="bold" title="Bold" />
            <ToolbarButton icon={Italic} command="italic" title="Italic" />
            <ToolbarButton icon={Underline} command="underline" title="Underline" />
        </div>
        
        <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1">
            <ToolbarButton icon={Heading1} command="formatBlock" value="H2" title="Heading 1" />
            <ToolbarButton icon={Heading2} command="formatBlock" value="H3" title="Heading 2" />
            <ToolbarButton icon={Quote} command="formatBlock" value="blockquote" title="Quote" />
        </div>

        <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1">
            <ToolbarButton icon={List} command="insertUnorderedList" title="Bullet List" />
            <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Numbered List" />
        </div>

        <div className="flex gap-0.5 border-r border-gray-300 pr-2 mr-1">
            <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Align Left" />
            <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Align Center" />
            <ToolbarButton icon={AlignRight} command="justifyRight" title="Align Right" />
        </div>

        <div className="flex gap-0.5">
             <ToolbarButton icon={LinkIcon} command="createLink" title="Insert Link" />
             <ToolbarButton icon={ImageIcon} command="insertImage" title="Insert Image" />
        </div>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="flex-1 p-4 overflow-y-auto outline-none prose prose-lg max-w-none min-h-[300px] font-serif text-gray-800"
        style={{ whiteSpace: 'pre-wrap' }}
      />
      {content === '' && (
          <div className="absolute top-[100px] left-4 text-gray-300 pointer-events-none font-serif text-lg">
              {placeholder || 'Start writing...'}
          </div>
      )}
    </div>
  );
};

export default RichTextEditor;