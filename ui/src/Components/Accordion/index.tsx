import { FC, ReactNode, useState } from "react";

export const AccordionItem: FC<{
  text: string;
  content: ReactNode;
  defaultIsOpen?: boolean;
}> = ({ text, content, defaultIsOpen }) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultIsOpen || false);

  return (
    <div className="accordion-item">
      <h2 className="accordion-header">
        <button
          className={`accordion-button ${isOpen ? "" : "collapsed"}`}
          type="button"
          onClick={() => setIsOpen((val) => !val)}
        >
          {text}
        </button>
      </h2>
      <div className={`accordion-collapse ${isOpen ? "show" : ""}`}>
        {isOpen ? <div className="accordion-body">{content}</div> : null}
      </div>
    </div>
  );
};

export const Accordion: FC = ({ children }) => {
  return <div className="accordion">{children}</div>;
};
