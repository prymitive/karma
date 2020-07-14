export const NewLabelName = (v: string) => `New label: ${v}`;

export const NewLabelValue = (v: string) => `New value: ${v}`;

export interface OptionT {
  label: string;
  value: string;
}

export const StringToOption = (value: string): OptionT => ({
  label: value,
  value: value,
});
