import {
  FC,
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  ChangeEvent,
} from "react";

import { useOnClickOutside } from "Hooks/useOnClickOutside";

const InlineEdit: FC<{
  className?: string;
  classNameEditing?: string;
  value: string;
  onChange: (value: string) => void;
  onEnterEditing?: () => void;
  onExitEditing?: () => void;
}> = ({
  className,
  classNameEditing,
  value,
  onChange,
  onEnterEditing,
  onExitEditing,
}) => {
  const ref = useRef<HTMLInputElement | null>(null);
  const [editedValue, setEditedValue] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const startEditing = () => {
    if (onEnterEditing) {
      onEnterEditing();
    }
    setIsEditing(true);
  };

  const doneEditing = () => {
    setIsEditing(false);
    setEditedValue(null);
    if (onExitEditing) {
      onExitEditing();
    }
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    setEditedValue(event.target.value);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      if (editedValue !== null && editedValue.trim() !== "") {
        onChange(editedValue.trim());
      } else if (editedValue === "") {
        onChange("");
      }
      doneEditing();
    } else if (event.key === "Escape") {
      doneEditing();
    }
  };

  useOnClickOutside(ref, doneEditing, isEditing);

  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus();
    }
  }, [isEditing, ref]);

  if (isEditing) {
    const val = editedValue === null ? value : editedValue;

    return (
      <input
        ref={ref}
        type="text"
        className={classNameEditing}
        value={val}
        size={val.length + 1}
        onChange={onInput}
        onKeyDown={onKeyDown}
      />
    );
  }

  return (
    <span tabIndex={0} className={className} onClick={startEditing}>
      {value}
    </span>
  );
};

export { InlineEdit };
