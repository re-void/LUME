/**
 * Settings — Notifications section (desktop notifications + sound).
 */

"use client";

import type { Settings } from "@/crypto/storage";
import { requestNotificationPermission } from "@/lib/notifications";
import { setSoundEnabled } from "@/lib/sounds";
import { SectionHeading, ToggleRow } from "./shared";

interface NotificationsSectionProps {
  settings: Settings;
  soundOn: boolean;
  onSoundChange: (v: boolean) => void;
  onUpdate: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export default function NotificationsSection({
  settings,
  soundOn,
  onSoundChange,
  onUpdate,
}: NotificationsSectionProps) {
  return (
    <section>
      <SectionHeading>Notifications</SectionHeading>
      <ToggleRow
        label="Desktop Notifications"
        description="Show a notification when a new message arrives"
        checked={settings.notifications}
        onChange={(v) => {
          void onUpdate("notifications", v);
          if (v) {
            void requestNotificationPermission().catch(() => {});
          }
        }}
      />
      <ToggleRow
        label="Sound"
        description="Play a chime when a new message arrives"
        checked={soundOn}
        onChange={(v) => {
          onSoundChange(v);
          setSoundEnabled(v);
        }}
      />
    </section>
  );
}
