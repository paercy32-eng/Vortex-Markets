interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 64, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="vortexRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="16" fill="url(#vortexRed)" />

      {/* Outer V */}
      <path
        d="M 16 18 L 32 50 L 48 18"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Inner echo (vortex depth) */}
      <path
        d="M 22 18 L 32 38 L 42 18"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

export function LogoWithText({ size = 56 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={size} />
      <div className="leading-tight">
        <p className="font-bold text-foreground text-lg">
          Vortex Markets
        </p>
        <p className="text-muted text-[11px]">
          Smart Modules. Real Value.
        </p>
      </div>
    </div>
  );
}
