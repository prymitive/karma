import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";

import { useOnClickOutside } from "Hooks/useOnClickOutside";

const InlineEdit = ({
  className,
  classNameEditing,
  value,
  onChange,
  onEnterEditing,
  onExitEditing,
}) => {
  const ref = useRef(null);
  const [editedValue, setEditedValue] = useState(null);
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

  const onInput = (event) => {
    setEditedValue(event.target.value.trim());
  };

  const onKeyDown = (event) => {
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
InlineEdit.propTypes = {
  className: PropTypes.string,
  classNameEditing: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onEnterEditing: PropTypes.func,
  onExitEditing: PropTypes.func,
};

export { InlineEdit };
