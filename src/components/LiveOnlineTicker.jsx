import React, { useState, useEffect, useRef } from 'react';

/**
 * LiveOnlineTicker:
 * Renders an animated live online user counter with smooth rolling transition
 * and organic micro-dynamics for realistic continuous presence without stopping.
 */
export default function LiveOnlineTicker({
  baseCount = 0,
  showLabel = true,
  label = 'kishi',
  className = '',
  size = 'md', // 'sm', 'md', 'lg'
}) {
  const currentVal = Math.max(0, Number(baseCount) || 0);
  const [displayCount, setDisplayCount] = useState(currentVal);
  const [isChanging, setIsChanging] = useState(false);
  const [direction, setDirection] = useState('up'); // 'up' or 'down'
  const prevCountRef = useRef(currentVal);

  // Sync with real backend WebSocket count when baseCount changes
  useEffect(() => {
    const val = Math.max(0, Number(baseCount) || 0);
    if (val !== prevCountRef.current) {
      setDirection(val > prevCountRef.current ? 'up' : 'down');
      setIsChanging(true);
      setDisplayCount(val);
      prevCountRef.current = val;
      const timer = setTimeout(() => setIsChanging(false), 500);
      return () => clearTimeout(timer);
    }
  }, [baseCount]);

  const sizeClasses = {
    sm: { height: 'h-4', font: 'text-xs', ping: 'h-1.5 w-1.5' },
    md: { height: 'h-5', font: 'text-sm', ping: 'h-2 w-2' },
    lg: { height: 'h-8', font: 'text-2xl font-black', ping: 'h-2.5 w-2.5' }
  }[size] || { height: 'h-5', font: 'text-sm', ping: 'h-2 w-2' };

  return (
    <div className={`inline-flex items-center justify-center gap-1.5 font-headline font-bold ${className}`}>
      {/* Live Radar Ping Dot */}
      <span className={`relative flex ${sizeClasses.ping} shrink-0`}>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-full w-full bg-secondary shadow-[0_0_8px_#01e599]"></span>
      </span>

      {/* Rolling Animated Number with Neon Flash */}
      <div className={`relative overflow-hidden ${sizeClasses.height} flex items-center justify-center min-w-[18px]`}>
        <span
          key={displayCount}
          style={{
            animation: direction === 'up'
              ? 'tickerSlideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              : 'tickerSlideDown 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
          className={`font-mono ${sizeClasses.font} tracking-tight transition-all duration-300 ${
            isChanging
              ? 'text-secondary drop-shadow-[0_0_10px_rgba(1,229,153,0.9)] scale-110'
              : 'text-secondary drop-shadow-[0_0_4px_rgba(1,229,153,0.3)]'
          }`}
        >
          {displayCount}
        </span>
      </div>

      {showLabel && (
        <span className="text-sm font-sans text-secondary font-medium tracking-tight">
          {label}
        </span>
      )}
    </div>
  );
}
