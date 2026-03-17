import Image from 'next/image';

interface LumeLogoProps {
  size?: number;
  withBackground?: boolean;
  auto?: boolean;
  className?: string;
  priority?: boolean;
}

export default function LumeLogo({
  size = 168,
  withBackground = false,
  auto = false,
  className = '',
  priority = false,
}: LumeLogoProps) {
  if (auto) {
    return (
      <span
        className={`inline-block relative lume-logo-auto ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src="/lume-logo-no-bg.png"
          alt="LUME"
          width={size}
          height={size}
          priority={priority}
          className="lume-logo lume-logo--light"
        />
        <Image
          src="/lume-logo-with-bg.png"
          alt="LUME"
          width={size}
          height={size}
          priority={priority}
          className="lume-logo lume-logo--dark"
        />
      </span>
    );
  }

  const src = withBackground ? '/lume-logo-with-bg.png' : '/lume-logo-no-bg.png';

  return (
    <Image
      src={src}
      alt="LUME"
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
