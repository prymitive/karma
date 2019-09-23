import React from "react";

import Collapsible from "react-collapsible";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";

const Trigger = ({ text, isOpen }) => (
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

const Accordion = ({ text, content, extraProps }) => (
  <Collapsible
    triggerTagName="div"
    transitionTime={50}
    className="card"
    openedClassName="card"
    triggerClassName="card-header cursor-pointer"
    triggerOpenedClassName="card-header cursor-pointer bg-light"
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
