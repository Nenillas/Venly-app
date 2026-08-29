interface LogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/** Brand mark — two indigo lobes with a teal anchor. */
export default function Logo({ size = 40, className = '', title = 'Venly' }: LogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        width="100%"
        height="100%"
        role="img"
        aria-label={title}
        className="block h-full w-full"
      >
        <title>{title}</title>
        <path
          d="M38 76 C38 55 55 38 76 38 H111 C121 38 128 46 128 56 V141 C128 153 119 162 107 162 H91 C79 162 70 155 65 145 L41 97 C39 91 38 84 38 76Z"
          fill="#6366F1"
        />
        <path
          d="M218 76 C218 55 201 38 180 38 H145 C135 38 128 46 128 56 V141 C128 153 137 162 149 162 H165 C177 162 186 155 191 145 L215 97 C217 91 218 84 218 76Z"
          fill="#4F46E5"
        />
        <circle cx="128" cy="194" r="17" fill="#10B981" />
      </svg>
    </span>
  );
}

export { Logo as VenlyLogo };
