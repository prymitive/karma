import React, { FunctionComponent, ReactNode } from "react";

import Collapsible from "react-collapsible";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";

const Trigger: FunctionComponent<{ text: string; isOpen: boolean }> = ({
  text,
  isOpen,
}) => (
  <div className="d-flex flex-row justify-content-between">
    <div>{text}</div>
    <div>
      <FontAwesomeIcon
        icon={isOpen ? faChevronDown : faChevronUp}
        className="text-muted"
      />
    </div>
  </div>
);

const Accordion: FunctionComponent<{
  text: string;
  content: ReactNode;
  extraProps?: object;
}> = ({ text, content, extraProps }) => (
  <Collapsible
    triggerTagName="div"
    transitionTime={50}
    overflowWhenOpen="visible"
    className="card"
    openedClassName="card"
    triggerClassName="card-header cursor-pointer border-bottom-0"
    triggerOpenedClassName="card-header cursor-pointer"
    contentOuterClassName="collapse show"
    contentInnerClassName="card-body my-2"
    {...extraProps}
    trigger={<Trigger text={text} isOpen={false} />}
    triggerWhenOpen={<Trigger text={text} isOpen={true} />}
  >
    {content}
  </Collapsible>
);

export { Accordion };
