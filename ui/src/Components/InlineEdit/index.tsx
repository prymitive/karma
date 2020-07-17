import React, {
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
  const ref = useRef(null as null | HTMLInputElement);
  const [editedValue, setEditedValue] = useState(null as null | string);
  const [isEditing, setIsEditing] = useState(false);

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
    setEditedValue(event.target.value.trim());
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === 13) {
      if (editedValue) {
        onChange(editedValue);
      }
      doneEditing();
    } else if (event.keyCode === 27) {
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
