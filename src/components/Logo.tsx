interface LogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/** Equilibrium mark — two indigo lobes with an emerald point. */
export default function Logo({ size = 40, className = '', title = 'Venly' }: LogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <img
        src="/venly-logo.svg"
        width={size}
        height={size}
        alt={title}
        className="block h-full w-full"
      />
    </span>
  );
}

export { Logo as VenlyLogo };
