import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MEAL_TYPES, type MealType } from "@/lib/meals";

interface MealTypeSelectProps {
  value: MealType;
  onChange: (value: MealType) => void;
  className?: string;
}

export default function MealTypeSelect({ value, onChange, className = "bg-secondary/30 border-none rounded-xl h-14 text-base" }: MealTypeSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as MealType)}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MEAL_TYPES.map((m) => (
          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
