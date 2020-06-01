import React, { FunctionComponent, ReactNode, useState } from "react";

import { ToggleIcon } from "Components/ToggleIcon";

const Trigger: FunctionComponent<{ text: string; isOpen: boolean }> = ({
  text,
  isOpen,
}) => (
  <div className="d-flex flex-row justify-content-between">
    <div>{text}</div>
    <div>
      <ToggleIcon isOpen={isOpen} className="text-muted" />
    </div>
  </div>
);

const Accordion: FunctionComponent<{
  text: string;
  content: ReactNode;
  defaultIsOpen?: boolean;
}> = ({ text, content, defaultIsOpen }) => {
  const [isOpen, setIsOpen] = useState(defaultIsOpen || false);

  return (
    <div className="accordion card">
      <div
        className={`card-header cursor-pointer ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Trigger text={text} isOpen={isOpen} />
      </div>
      <div className={isOpen ? "card-body my-2" : ""}>{isOpen && content}</div>
    </div>
  );
};

export { Accordion };
