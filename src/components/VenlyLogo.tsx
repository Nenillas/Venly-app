interface VenlyLogoProps {
  size?: number;
  className?: string;
}

export default function VenlyLogo({ size = 40, className = '' }: VenlyLogoProps) {
  return (
    <img
      src="/venly-logo.png"
      alt="Venly"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}
