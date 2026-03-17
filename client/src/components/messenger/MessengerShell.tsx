import React from 'react';

export default function MessengerShell({
  leftRail,
  chatList,
  main,
  rightRail,
}: {
  leftRail?: React.ReactNode;
  chatList: React.ReactNode;
  main: React.ReactNode;
  rightRail?: React.ReactNode;
}) {
  const hasRightRail = Boolean(rightRail);
  const xlCols = hasRightRail ? 'xl:grid-cols-[260px_340px_1fr_84px]' : 'xl:grid-cols-[260px_340px_1fr]';

  return (
    <div className="h-full w-full p-0">
      <div
        className={`
          h-full w-full grid min-h-0
          grid-cols-1
          md:grid-cols-[340px_1fr]
          lg:grid-cols-[240px_340px_1fr]
          ${xlCols}
          gap-3 md:gap-4 lg:gap-4
          p-3 sm:p-4 lg:p-4
        `}
      >
        {leftRail ? <div className="hidden lg:block min-h-0">{leftRail}</div> : null}
        <div className="hidden md:block min-h-0">{chatList}</div>
        <div className="min-h-0">{main}</div>
        {rightRail ? <div className="hidden xl:block min-h-0">{rightRail}</div> : null}
      </div>
    </div>
  );
}
