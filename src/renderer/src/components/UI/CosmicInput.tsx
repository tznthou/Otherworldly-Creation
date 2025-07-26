import React, { useState, useRef, useEffect } from 'react';

interface CosmicInputProps {
  type?: 'text' | 'password' | 'email' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  icon?: React.ReactNode;
  glowEffect?: boolean;
  magicBorder?: boolean;
  className?: string;
}

const CosmicInput: React.FC<CosmicInputProps> = ({
  type = 'text',
  placeholder,
  value = '',
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  error,
  label,
  icon,
  glowEffect = false,
  magicBorder = false,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasValue(value.length > 0);
  }, [value]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      {/* 標籤 */}
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2 font-cosmic">
          {label}
        </label>
      )}
      
      {/* 輸入框容器 */}
      <div className="relative">
        {/* 背景光效 */}
        {glowEffect && isFocused && (
          <div className="absolute inset-0 bg-gold-500/10 rounded-lg blur-sm animate-pulse" />
        )}
        
        {/* 魔法邊框 */}
        {magicBorder && (
          <div className={`absolute inset-0 rounded-lg border-2 transition-all duration-300 ${
            isFocused 
              ? 'border-gold-500 shadow-lg shadow-gold-500/25' 
              : 'border-mystic-500/30'
          } ${magicBorder ? 'animate-pulse' : ''}`} />
        )}
        
        {/* 輸入框 */}
        <div className={`relative flex items-center ${
          error 
            ? 'border-red-500 shadow-red-500/25' 
            : isFocused 
              ? 'border-gold-500 shadow-gold-500/25' 
              : 'border-cosmic-600'
        } bg-cosmic-800 border rounded-lg transition-all duration-200 ${
          glowEffect && isFocused ? 'shadow-lg' : ''
        }`}>
          
          {/* 圖標 */}
          {icon && (
            <div className="flex items-center justify-center w-10 h-10 text-gray-400">
              {icon}
            </div>
          )}
          
          {/* 輸入欄位 */}
          <input
            ref={inputRef}
            type={type}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            className={`
              flex-1 bg-transparent text-white placeholder-gray-400 
              px-4 py-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-0' : ''}
            `}
          />
          
          {/* 清除按鈕 */}
          {hasValue && !disabled && (
            <button
              type="button"
              onClick={() => onChange?.('')}
              className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white transition-colors mr-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* 浮動標籤效果 */}
        {placeholder && (isFocused || hasValue) && (
          <div className={`absolute left-3 transition-all duration-200 pointer-events-none ${
            isFocused || hasValue 
              ? '-top-2 text-xs bg-cosmic-800 px-1 text-gold-400' 
              : 'top-2 text-gray-400'
          }`}>
            {placeholder}
          </div>
        )}
      </div>
      
      {/* 錯誤訊息 */}
      {error && (
        <div className="mt-1 text-sm text-red-400 animate-slide-in-up">
          {error}
        </div>
      )}
      
      {/* 底部光線效果 */}
      {isFocused && !error && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent animate-pulse" />
      )}
    </div>
  );
};

export default CosmicInput;