import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ParticleEffectProps {
  particleCount?: number;
  color?: string;
  className?: string;
  trigger?: boolean;
}

const ParticleEffect: React.FC<ParticleEffectProps> = ({
  particleCount = 50,
  color = '#FFD700',
  className = '',
  trigger = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 設置畫布大小
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 創建粒子
    const createParticle = (x: number, y: number): Particle => ({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 0,
      maxLife: Math.random() * 60 + 30,
      size: Math.random() * 3 + 1,
      color,
    });

    // 初始化粒子
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(
          createParticle(
            Math.random() * canvas.width,
            Math.random() * canvas.height
          )
        );
      }
    };

    if (trigger) {
      initParticles();
    }

    // 動畫循環
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((particle) => {
        // 更新粒子位置
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life++;

        // 計算透明度
        const alpha = 1 - particle.life / particle.maxLife;

        if (alpha > 0) {
          // 繪製粒子
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fillStyle = `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
          ctx.fill();

          // 添加發光效果
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `${particle.color}${Math.floor(alpha * 50).toString(16).padStart(2, '0')}`;
          ctx.fill();

          return true;
        }

        return false;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particleCount, color, trigger]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ background: 'transparent' }}
    />
  );
};

export default ParticleEffect;