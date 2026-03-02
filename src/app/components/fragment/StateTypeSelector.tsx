import { RadioSelector } from "../ui/RadioSelector";
import type { StateType } from "./types";

const STATE_TYPE_OPTIONS = [
  { label: "Pattern", value: "pattern" as const },
  { label: "Text", value: "text" as const },
];

interface StateTypeSelectorProps {
  value: StateType;
  onChange: (value: StateType) => void;
}

export function StateTypeSelector({ value, onChange }: StateTypeSelectorProps) {
  return (
    <RadioSelector options={STATE_TYPE_OPTIONS} value={value} onChange={onChange} />
  );
}
