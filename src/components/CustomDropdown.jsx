import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

function CustomDropdown({ options, value, onChange, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const selectedOption = options.find(opt => opt.value === value);
    setSelectedLabel(selectedOption ? selectedOption.label : placeholder);
  }, [value, options, placeholder]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Custom Dropdown Trigger */}
      <button
        type="button"
        className={`w-full px-4 py-3 bg-slate-50/70 backdrop-blur-sm border border-slate-200/80 rounded-2xl flex items-center justify-between text-[0.95rem] font-medium text-slate-700 hover:border-blue-400 hover:bg-white hover:shadow-md transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${isOpen ? 'ring-4 ring-blue-500/15 border-blue-500 bg-white shadow-lg translate-y-[-1px]' : ''}`}
        onClick={toggleDropdown}
      >
        <span className={`truncate ${!options.find(opt => opt.value === value) ? 'text-slate-300 font-light' : 'text-slate-700 font-medium'}`}>
          {selectedLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-200/80 py-2 z-[100] animate-slide-up overflow-hidden">
          <div className="max-h-60 overflow-y-auto no-scrollbar">
            {options.map((option, index) => (
              <button
                key={option.value || index}
                type="button"
                className={`w-full text-left px-4 py-2.5 text-[0.9rem] font-medium transition-all duration-200 flex items-center justify-between ${
                  value === option.value 
                    ? 'bg-blue-50/80 text-blue-700 relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-500' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                onClick={() => handleSelect(option)}
              >
                {option.label}
                {value === option.value && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomDropdown;
