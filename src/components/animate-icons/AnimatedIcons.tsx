import React from "react";
import { motion, useAnimation } from "motion/react";

export interface AnimatedIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  isHovered?: boolean;
}

// Helper wrapper for interactive hover state if used independently
function IconWrapper({
  children,
  className = "",
  onHoverStart,
  onHoverEnd,
}: {
  children: (isHovered: boolean) => React.ReactNode;
  className?: string;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <motion.span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      onHoverStart={() => {
        setHovered(true);
        onHoverStart?.();
      }}
      onHoverEnd={() => {
        setHovered(false);
        onHoverEnd?.();
      }}
    >
      {children(hovered)}
    </motion.span>
  );
}

// 1. Dashboard / LayoutGrid (4 squares staggering)
export function AnimatedLayoutGrid({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <motion.rect
              x="3" y="3" width="7" height="7" rx="1"
              animate={{ scale: active ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.3, delay: 0 }}
            />
            <motion.rect
              x="14" y="3" width="7" height="7" rx="1"
              animate={{ scale: active ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.3, delay: 0.08 }}
            />
            <motion.rect
              x="14" y="14" width="7" height="7" rx="1"
              animate={{ scale: active ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.3, delay: 0.16 }}
            />
            <motion.rect
              x="3" y="14" width="7" height="7" rx="1"
              animate={{ scale: active ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.3, delay: 0.24 }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 2. Download (Arrow sliding down)
export function AnimatedDownload({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <motion.g
              animate={{ y: active ? [0, 3.5, 0] : 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </motion.g>
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 3. Analytics / Activity (Line pulsing/drawing)
export function AnimatedActivity({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <motion.path
              d="M22 12h-4l-3 9L9 3l-3 9H2"
              animate={{
                pathLength: active ? [0.6, 1] : 1,
                scaleY: active ? [1, 1.25, 1] : 1,
              }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 4. Models / Package (Box lid lifting)
export function AnimatedPackage({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 9.4 7.55 4.24" />
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <motion.line
              x1="12" y1="22" x2="12" y2="12"
              animate={{ y: active ? [0, -2, 0] : 0 }}
              transition={{ duration: 0.35 }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 5. Search (Lens zoom & handle nudge)
export function AnimatedSearch({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <motion.circle
              cx="11" cy="11" r="8"
              animate={{ scale: active ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 0.35 }}
            />
            <motion.line
              x1="21" y1="21" x2="16.65" y2="16.65"
              animate={{ x: active ? [0, 2, 0] : 0, y: active ? [0, 2, 0] : 0 }}
              transition={{ duration: 0.35 }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 6. Shield (Glow pulse & scale)
export function AnimatedShield({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <motion.path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              animate={{
                scale: active ? [1, 1.14, 1] : 1,
                rotate: active ? [0, -5, 5, 0] : 0,
              }}
              transition={{ duration: 0.4 }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 7. Server (Bays & blips flashing)
export function AnimatedServer({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
            <motion.line
              x1="10" y1="6" x2="10.01" y2="6"
              animate={{ opacity: active ? [1, 0.2, 1] : 1 }}
              transition={{ duration: 0.3, repeat: active ? 1 : 0 }}
            />
            <motion.line
              x1="10" y1="18" x2="10.01" y2="18"
              animate={{ opacity: active ? [0.2, 1, 0.2] : 1 }}
              transition={{ duration: 0.3, repeat: active ? 1 : 0 }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 8. FolderCog (Gear rotating inside folder)
export function AnimatedFolderCog({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.5 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v3.5" />
            <motion.g
              style={{ transformOrigin: "18px 18px" }}
              animate={{ rotate: active ? 180 : 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <circle cx="18" cy="18" r="3" />
              <path d="M18 14v1M18 21v1M21.5 16l-.87.5M15.37 19.5l-.87.5M21.5 20l-.87-.5M15.37 16.5l-.87-.5" />
            </motion.g>
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 9. Users (People heads bobbing)
export function AnimatedUsers({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <motion.circle
              cx="9" cy="7" r="4"
              animate={{ y: active ? [0, -2.5, 0] : 0 }}
              transition={{ duration: 0.35 }}
            />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <motion.path
              d="M16 3.13a4 4 0 0 1 0 7.75"
              animate={{ y: active ? [0, -2, 0] : 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 10. Home (Roof lifting)
export function AnimatedHome({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <motion.path
              d="M3 9l9-7 9 7"
              animate={{ y: active ? [0, -2.5, 0] : 0 }}
              transition={{ duration: 0.35 }}
            />
            <path d="M9 22V12h6v10" />
            <path d="M21 10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10" />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 11. Bell (Swinging clapper)
export function AnimatedBell({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <motion.g
              style={{ transformOrigin: "12px 2px" }}
              animate={{ rotate: active ? [0, 18, -18, 10, -10, 0] : 0 }}
              transition={{ duration: 0.5 }}
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </motion.g>
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 12. Clock (Hands spinning)
export function AnimatedClock({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12" />
            <motion.line
              x1="12" y1="12" x2="16" y2="14"
              style={{ transformOrigin: "12px 12px" }}
              animate={{ rotate: active ? [0, 360] : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 13. Terminal (Cursor blinking)
export function AnimatedTerminal({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <motion.line
              x1="12" y1="19" x2="20" y2="19"
              animate={{ opacity: active ? [1, 0, 1, 0, 1] : 1 }}
              transition={{ duration: 0.5 }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 14. Wifi (Waves spreading)
export function AnimatedWifi({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5 12.55a11 11 0 0 1 14.08 0" animate={{ opacity: active ? [0.2, 1] : 1 }} transition={{ duration: 0.2 }} />
            <motion.path d="M1.42 9a16 16 0 0 1 21.16 0" animate={{ opacity: active ? [0.2, 1] : 1 }} transition={{ duration: 0.35, delay: 0.1 }} />
            <motion.path d="M8.53 16.11a6 6 0 0 1 6.95 0" animate={{ opacity: active ? [0.2, 1] : 1 }} transition={{ duration: 0.15 }} />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 15. Key (Key turning)
export function AnimatedKey({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <motion.g
              style={{ transformOrigin: "7.5px 16.5px" }}
              animate={{ rotate: active ? [0, -35, 0] : 0 }}
              transition={{ duration: 0.4 }}
            >
              <path d="M21 2l-2 2m-1.5 1.5L14 9.5l-2.5-2.5L4 14.5a5 5 0 1 0 7 7l7.5-7.5-2.5-2.5L21 2z" />
              <circle cx="7.5" cy="16.5" r="1.5" />
            </motion.g>
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 16. ChevronRight (Nudging right)
export function AnimatedChevronRight({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <motion.polyline
              points="9 18 15 12 9 6"
              animate={{ x: active ? [0, 3.5, 0] : 0 }}
              transition={{ duration: 0.35 }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 17. HelpCircle (Question mark tilt)
export function AnimatedHelpCircle({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <motion.path
              d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
              animate={{ rotate: active ? [0, -15, 15, 0] : 0 }}
              style={{ transformOrigin: "12px 12px" }}
              transition={{ duration: 0.4 }}
            />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 18. Ban (Striking line/circle)
export function AnimatedBan({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <motion.circle
              cx="12" cy="12" r="10"
              animate={{ scale: active ? [1, 1.12, 1] : 1 }}
              transition={{ duration: 0.35 }}
            />
            <motion.line
              x1="4.93" y1="4.93" x2="19.07" y2="19.07"
              animate={{ opacity: active ? [0.4, 1] : 1 }}
              transition={{ duration: 0.3 }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 19. Folder (Flap opening)
export function AnimatedFolder({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <motion.path
              d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
              animate={{ y: active ? [0, -2, 0] : 0 }}
              transition={{ duration: 0.35 }}
            />
          </svg>
        );
      }}
    </IconWrapper>
  );
}

// 20. Sliders / Settings (Gear spinning)
export function AnimatedSliders({ size = 16, strokeWidth = 2, className = "", isHovered: externalHover }: AnimatedIconProps) {
  return (
    <IconWrapper className={className}>
      {(internalHover) => {
        const active = externalHover ?? internalHover;
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <motion.line x1="1" y1="14" x2="7" y2="14" animate={{ x: active ? [0, 2, 0] : 0 }} transition={{ duration: 0.3 }} />
            <motion.line x1="9" y1="8" x2="15" y2="8" animate={{ x: active ? [0, -2, 0] : 0 }} transition={{ duration: 0.3 }} />
            <motion.line x1="17" y1="16" x2="23" y2="16" animate={{ x: active ? [0, 2, 0] : 0 }} transition={{ duration: 0.3 }} />
          </svg>
        );
      }}
    </IconWrapper>
  );
}
