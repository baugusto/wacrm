'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

type ROIWiseLogoProps = {
  className?: string;
  markSize?: number;
  variant?: 'horizontal' | 'mark';
  inverted?: boolean;
  showTagline?: boolean;
};

export function ROIWiseLogo({
  className,
  markSize = 36,
  variant = 'horizontal',
  inverted = false,
  showTagline = false,
}: ROIWiseLogoProps) {
  if (variant === 'mark') {
    return (
      <LogoMark size={markSize} inverted={inverted} className={className} />
    );
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={markSize} inverted={inverted} />
      <div className="min-w-0">
        <div className="font-heading text-foreground text-[15px] leading-none font-bold tracking-normal">
          ROI <span className="text-primary">Wise</span>
        </div>
        {showTagline ? (
          <div className="text-muted-foreground mt-1 font-mono text-[8px] leading-none font-semibold tracking-[0.18em] uppercase">
            Revenue Intelligence
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LogoMark({
  size = 36,
  inverted = false,
  className,
}: {
  size?: number;
  inverted?: boolean;
  className?: string;
}) {
  const bg0 = inverted ? 'rgba(255,255,255,0.16)' : '#0C1F38';
  const bg1 = inverted ? 'rgba(255,255,255,0.05)' : '#050D1A';
  const stroke = inverted ? 'white' : '#0BBFAD';
  const border = inverted ? 'rgba(255,255,255,0.25)' : 'rgba(11,191,173,0.22)';
  const uid = useId().replaceAll(':', '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient
          id={uid}
          x1="0"
          y1="0"
          x2="36"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={bg0} />
          <stop offset="1" stopColor={bg1} />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="9" fill={`url(#${uid})`} />
      <rect
        width="36"
        height="36"
        rx="9"
        fill="none"
        stroke={border}
        strokeWidth="1"
      />
      <line
        x1="5.5"
        y1="30"
        x2="12.5"
        y2="13"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeOpacity="0.32"
      />
      <line
        x1="14.5"
        y1="27"
        x2="21.5"
        y2="10"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeOpacity="0.63"
      />
      <line
        x1="23.5"
        y1="24"
        x2="30.5"
        y2="7"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
