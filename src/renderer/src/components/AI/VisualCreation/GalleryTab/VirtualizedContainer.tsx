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
        console.log('📏 VirtualizedContainer: 尺寸更新', {
          width,
          height,
          containerExists: !!containerRef.current,
          boundingRect: containerRef.current.getBoundingClientRect()
        });
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

    // 清理 - 在外部保存 ref 的值
    const currentContainer = containerRef.current;
    return () => {
      if (currentContainer) {
        resizeObserver.unobserve(currentContainer);
      }
      resizeObserver.disconnect();
    };
  }, []);

  // 📏 組件渲染時的調試信息
  console.log('📏 VirtualizedContainer: 組件渲染', {
    dimensions,
    willRenderChildren: dimensions.width > 0 && dimensions.height > 0,
    className
  });

  return (
    <div ref={containerRef} className={`w-full h-full min-h-[500px] ${className}`}>
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <>
          {console.log('✅ VirtualizedContainer: 渲染子組件', dimensions)}
          {children(dimensions)}
        </>
      ) : (
        <>
          {console.log('❌ VirtualizedContainer: 尺寸無效，不渲染子組件', dimensions)}
          <div className="flex items-center justify-center h-full text-cosmic-400">
            📏 等待容器尺寸計算...
          </div>
        </>
      )}
    </div>
  );
};

export default VirtualizedContainer;