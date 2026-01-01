
import React from 'react';
import { X, Check, Grid, Tag } from 'lucide-react';

interface CategorySelectorProps {
  options: string[];
  selected: string[];
  onChange: (categories: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ options, selected, onChange, isOpen, onClose }) => {
  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    if (selected.includes(cat)) {
      onChange(selected.filter(c => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg font-serif flex items-center gap-2">
              <Tag size={18} className="text-news-gold" /> Select Categories
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-black"><X size={20}/></button>
        </div>
        <div className="p-2 overflow-y-auto flex-1 bg-white">
          <div className="space-y-1">
            {options.map(option => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => toggleCategory(option)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-all duration-200 group border ${isSelected ? 'bg-news-black text-white border-news-black shadow-md' : 'bg-white hover:bg-gray-50 text-gray-700 border-transparent hover:border-gray-100'}`}
                >
                  <span className={`font-medium ${isSelected ? 'tracking-wide' : ''}`}>{option}</span>
                  {isSelected && <div className="bg-news-gold text-black rounded-full p-0.5"><Check size={14} strokeWidth={3} /></div>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="w-full bg-news-black text-white py-3 rounded-lg font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
            Confirm Selection ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategorySelector;
