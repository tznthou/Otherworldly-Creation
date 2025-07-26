import React, { useState, useRef, useEffect } from 'react';

interface MenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
}

interface MenuItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
}

export const Menu: React.FC<MenuProps> = ({ 
  trigger, 
  children, 
  position = 'bottom-left',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current && 
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 根據位置設置選單樣式
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'right-0 top-full mt-1';
      case 'top-left':
        return 'left-0 bottom-full mb-1';
      case 'top-right':
        return 'right-0 bottom-full mb-1';
      case 'bottom-left':
      default:
        return 'left-0 top-full mt-1';
    }
  };

  return (
    <div className="relative">
      <div ref={triggerRef} onClick={toggleMenu}>
        {trigger}
      </div>
      
      {isOpen && (
        <div 
          ref={menuRef}
          className={`absolute z-50 min-w-[180px] bg-cosmic-800 border border-cosmic-700 rounded-lg shadow-lg py-1 ${getPositionClasses()} ${className}`}
        >
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, {
                closeMenu
              });
            }
            return child;
          })}
        </div>
      )}
    </div>
  );
};

export const MenuItem: React.FC<MenuItemProps & { closeMenu?: () => void }> = ({ 
  children, 
  icon, 
  onClick, 
  className = '',
  disabled = false,
  closeMenu
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    
    if (onClick) {
      onClick(e);
    }
    
    if (closeMenu) {
      closeMenu();
    }
  };

  return (
    <div 
      className={`px-4 py-2 flex items-center text-sm cursor-pointer hover:bg-cosmic-700 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={handleClick}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </div>
  );
};