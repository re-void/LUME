"use client";

import { useState, useMemo } from "react";
import { minidenticon } from "minidenticons";

const SIZE_MAP = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-11 h-11",
  xl: "w-24 h-24",
} as const;

type AvatarSize = keyof typeof SIZE_MAP;

interface AvatarProps {
  src?: string | null;
  username: string;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ src, username, size = "md", className = "" }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_MAP[size];

  const identiconSrc = useMemo(() => {
    const svg = minidenticon(username, 90, 50);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [username]);

  const showImage = src && !imgError;

  return (
    <div
      className={`${sizeClass} rounded-full flex-shrink-0 overflow-hidden ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={`${username}'s avatar`}
          className="w-full h-full rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full rounded-full bg-[var(--surface-strong)] border border-[var(--border)] flex items-center justify-center">
          <img
            src={identiconSrc}
            alt={`${username}'s avatar`}
            className="w-[70%] h-[70%]"
          />
        </div>
      )}
    </div>
  );
}
