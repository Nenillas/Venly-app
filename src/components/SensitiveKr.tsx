import { formatKr, formatNumber } from '@/lib/format';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

const MASK = '•••• kr';

export function SensitiveKr({
  value,
  className = '',
  suffix = '',
  numberOnly = false,
}: {
  value: number;
  className?: string;
  suffix?: string;
  numberOnly?: boolean;
}) {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const visible = isPrivacyModeEnabled
    ? `${MASK}${suffix}`
    : numberOnly
      ? `${formatNumber(value)} kr${suffix}`
      : `${formatKr(value)}${suffix}`;
  return (
    <span className={`transition-all ${isPrivacyModeEnabled ? 'blur-sm select-none' : ''} ${className}`}>
      {visible}
    </span>
  );
}

export function sensitiveKrText(value: number, privacy: boolean): string {
  return privacy ? MASK : formatKr(value);
}
