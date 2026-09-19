import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const { primaryColor } = useTheme();

  const sizeMap = {
    sm: { box: 'w-8 h-8', svg: 'w-5 h-5', text: 'text-base', sub: 'text-[9px]', badge: 'text-[8px] px-1.5 py-0.5' },
    md: { box: 'w-10 h-10', svg: 'w-6 h-6', text: 'text-lg', sub: 'text-[10px]', badge: 'text-[9px] px-2 py-0.5' },
    lg: { box: 'w-13 h-13', svg: 'w-8 h-8', text: 'text-2xl', sub: 'text-xs', badge: 'text-[10px] px-2.5 py-1' },
    xl: { box: 'w-16 h-16', svg: 'w-10 h-10', text: 'text-3xl', sub: 'text-sm', badge: 'text-xs px-3 py-1' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className="flex items-center gap-3 select-none" id="app-logo">
      {/* Modern Minimalist Mark */}
      <div className="relative group shrink-0">
        <div
          className={`${currentSize.box} rounded-2xl flex items-center justify-center relative overflow-hidden transition-all duration-300 shadow-md`}
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
            boxShadow: `0 4px 14px -2px ${primaryColor}40`,
          }}
        >
          {/* Subtle architectural grid pattern */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:6px_6px]" />

          {/* Premium Geometric Monogram: Interlocking 'M' & 'D' + Financial Growth Vector */}
          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`${currentSize.svg} relative z-10`}
          >
            {/* Soft Ambient Node */}
            <circle cx="28" cy="8" r="3" fill="#ffffff" fillOpacity="0.9" />

            {/* Dynamic Growth Ribbon / 'M' structure */}
            <path
              d="M7 26V13L13 21L19 13V26"
              stroke="#ffffff"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Precision 'D' / Growth Curve */}
            <path
              d="M19 13H24C27.3137 13 30 15.6863 30 19C30 22.3137 27.3137 25 24 25H19"
              stroke="#ffffff"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.85"
            />

            {/* Trendline Accent Node */}
            <path
              d="M20 10L28 8"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray="2 2"
              strokeOpacity="0.75"
            />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight ${currentSize.text} text-slate-900 dark:text-white`}>
              MY<span style={{ color: primaryColor }} className="ml-0.5">DUIT</span>
            </span>
            <span
              className={`font-extrabold tracking-wider uppercase rounded-full ${currentSize.badge}`}
              style={{
                backgroundColor: `${primaryColor}18`,
                color: primaryColor,
                border: `1px solid ${primaryColor}30`,
              }}
            >
              PRO
            </span>
          </div>
          <span className={`${currentSize.sub} font-medium tracking-wide text-slate-400 dark:text-slate-500 uppercase mt-0.5`}>
            Financial OS
          </span>
        </div>
      )}
    </div>
  );
};
