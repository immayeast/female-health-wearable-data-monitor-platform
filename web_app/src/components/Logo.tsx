import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 40, className }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(2px 2px 5px rgba(163, 177, 198, 0.4))' }}
    >
      {/* Muted Lavender Shape */}
      <rect 
        x="10" y="14" width="20" height="20" rx="10" 
        transform="rotate(-15 10 14)" 
        fill="var(--primary-lavender)" 
        opacity="0.9" 
      />
      {/* Research Mint Shape */}
      <rect 
        x="18" y="10" width="20" height="20" rx="10" 
        transform="rotate(15 18 10)" 
        fill="var(--secondary-mint)" 
        opacity="0.9" 
      />
      {/* Overlap Area Highlight */}
      <circle cx="24" cy="24" r="6" fill="#F4F5F7" opacity="0.3" />
    </svg>
  );
};

export default Logo;
