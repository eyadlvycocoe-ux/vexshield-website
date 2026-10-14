import React from 'react';

export interface IconProps<T extends string = string> extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  animateOnHover?: boolean;
}

export function AnimateIcon({
  children,
  animateOnHover = true,
  className = "",
}: {
  children?: React.ReactNode;
  animateOnHover?: boolean;
  asChild?: boolean;
  className?: string;
}) {
  if (!animateOnHover) return <>{children}</>;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-125 hover:rotate-6 ${className}`}
    >
      {children}
    </span>
  );
}
