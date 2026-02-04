'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TimeHorizon } from '@/lib/types/dashboard';

interface PeriodSelectorProps {
  value: TimeHorizon;
  onChange: (value: TimeHorizon) => void;
  disabled?: boolean;
}

export function PeriodSelector({
  value,
  onChange,
  disabled = false,
}: PeriodSelectorProps) {
  return (
    <Select
      value={value.toString()}
      onValueChange={(v) => onChange(Number(v) as TimeHorizon)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Selecione período" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="30">Próximos 30 dias</SelectItem>
        <SelectItem value="60">Próximos 60 dias</SelectItem>
        <SelectItem value="90">Próximos 90 dias</SelectItem>
      </SelectContent>
    </Select>
  );
}
