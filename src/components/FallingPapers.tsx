import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface Paper {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  color: string;
}

/** Skip heavy animation inside server dashboard — keeps navigation snappy. */
function isServerDashboardRoute(pathname: string): boolean {
  return /^\/[^/]+\/(dashboard|players|map|analytics|settings|resources|console|live-view|search|warns|kicks|bans|activity|admins|logs|pcchecker)/.test(
    pathname,
  );
}

export function FallingPapers() {
  const { pathname } = useLocation();
  const disabled = isServerDashboardRoute(pathname);
  const [papers, setPapers] = useState<Paper[]>([]);

  useEffect(() => {
    if (disabled) return;
    const generatedPapers: Paper[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 8,
      rotation: Math.random() * 360,
      color: i % 3 === 0 ? 'primary' : i % 3 === 1 ? 'accent' : 'success',
    }));
    setPapers(generatedPapers);
  }, [disabled]);

  if (disabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {papers.map((paper) => (
        <div
          key={paper.id}
          className="absolute opacity-20"
          style={{
            left: `${paper.left}%`,
            top: '-40px',
            animation: `fallDown ${paper.duration}s linear ${paper.delay}s infinite`,
            transform: `rotate(${paper.rotation}deg)`,
          }}
        >
          <svg
            width="24"
            height="28"
            viewBox="0 0 24 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            <path
              d="M2 0H18L22 4V26C22 27.1046 21.1046 28 20 28H4C2.89543 28 2 27.1046 2 26V0Z"
              fill={
                paper.color === 'primary'
                  ? 'hsl(var(--primary) / 0.4)'
                  : paper.color === 'accent'
                  ? 'hsl(var(--accent) / 0.4)'
                  : 'hsl(142 76% 36% / 0.35)'
              }
              stroke="hsl(var(--foreground) / 0.1)"
              strokeWidth="0.5"
            />
            <path
              d="M18 0L22 4H20C18.8954 4 18 3.10457 18 2V0Z"
              fill={
                paper.color === 'primary'
                  ? 'hsl(var(--primary) / 0.6)'
                  : paper.color === 'accent'
                  ? 'hsl(var(--accent) / 0.6)'
                  : 'hsl(142 76% 36% / 0.5)'
              }
            />
            {/* Paper lines */}
            <line x1="5" y1="8" x2="19" y2="8" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="0.5" />
            <line x1="5" y1="12" x2="19" y2="12" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="0.5" />
            <line x1="5" y1="16" x2="16" y2="16" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="0.5" />
            <line x1="5" y1="20" x2="19" y2="20" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="0.5" />
          </svg>
        </div>
      ))}
      <style>{`
        @keyframes fallDown {
          0% {
            transform: translateY(0) rotate(0deg) translateX(0);
            opacity: 0;
          }
          5% {
            opacity: 0.25;
          }
          95% {
            opacity: 0.2;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) translateX(120px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
