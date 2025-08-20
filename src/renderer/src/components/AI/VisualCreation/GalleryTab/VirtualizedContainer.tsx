import React, { useEffect, useRef, useState } from 'react';

interface VirtualizedContainerProps {
  children: (dimensions: { width: number; height: number }) => React.ReactNode;
  className?: string;
}

const VirtualizedContainer: React.FC<VirtualizedContainerProps> = ({ 
  children, 
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    // 初始計算
    updateDimensions();

    // 監聽視窗大小變化
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // 清理
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      {dimensions.width > 0 && dimensions.height > 0 && children(dimensions)}
    </div>
  );
};

export default VirtualizedContainer;