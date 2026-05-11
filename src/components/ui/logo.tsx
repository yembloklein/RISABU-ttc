import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 40 }: LogoProps) {
  return (
    <img 
      src="/risabuu.png" 
      alt="Risabu TTC Logo" 
      width={size} 
      height={size} 
      className={cn("object-contain", className)}
    />
  );
}
