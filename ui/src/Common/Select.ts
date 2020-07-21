export const NewLabelName = (v: string): string => `New label: ${v}`;

export const NewLabelValue = (v: string): string => `New value: ${v}`;

export interface OptionT {
  label: string;
  value: string;
}

export interface MultiValueOptionT {
  label: string;
  value: string[];
}

export const StringToOption = (value: string): OptionT => ({
  label: value,
  value: value,
});
