import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import myDuitLogoImg from '../../assets/images/my_duit_opt2_clean_large_bold.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const { primaryColor } = useTheme();

  const sizeMap = {
    sm: { box: 'w-8 h-8', img: 'w-8 h-8', text: 'text-base', sub: 'text-[9px]', badge: 'text-[8px] px-1.5 py-0.5' },
    md: { box: 'w-10 h-10', img: 'w-10 h-10', text: 'text-lg', sub: 'text-[10px]', badge: 'text-[9px] px-2 py-0.5' },
    lg: { box: 'w-16 h-16', img: 'w-16 h-16', text: 'text-2xl', sub: 'text-xs', badge: 'text-[10px] px-2.5 py-1' },
    xl: { box: 'w-24 h-24', img: 'w-24 h-24', text: 'text-3xl', sub: 'text-sm', badge: 'text-xs px-3 py-1' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className="flex items-center gap-3 select-none" id="app-logo">
      {/* Option 2 Wallet & Coin Clean Identity Mark */}
      <div className="relative group shrink-0">
        <div
          className={`${currentSize.box} rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-800 bg-white flex items-center justify-center transition-all duration-300 group-hover:scale-105`}
        >
          <img
            src={myDuitLogoImg}
            alt="MY DUIT Logo"
            className="w-full h-full object-cover"
          />
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
            Financial Management
          </span>
        </div>
      )}
    </div>
  );
};
