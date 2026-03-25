"use client";

import { useState } from "react";

const SIZE_MAP = {
  sm: "w-8 h-8 text-[13px]",
  md: "w-10 h-10 text-[15px]",
  lg: "w-11 h-11 text-[16px]",
  xl: "w-24 h-24 text-[32px]",
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
  const letter = (username[0] ?? "L").toUpperCase();

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
        <div className="w-full h-full rounded-full bg-[var(--surface-strong)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] font-semibold">
          {letter}
        </div>
      )}
    </div>
  );
}
