import { FC, useEffect, useRef, useState, memo } from "react";

import Linkify from "react-linkify";

import { CSSTransition } from "react-transition-group";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faSearchPlus } from "@fortawesome/free-solid-svg-icons/faSearchPlus";
import { faSearchMinus } from "@fortawesome/free-solid-svg-icons/faSearchMinus";

import { TooltipWrapper } from "Components/TooltipWrapper";
import { useFlashTransition } from "Hooks/useFlashTransition";

const RenderNonLinkAnnotation: FC<{
  name: string;
  value: string;
  visible: boolean;
  allowHTML: boolean;
  afterUpdate: () => void;
}> = memo(({ name, value, visible, afterUpdate, allowHTML }) => {
  const mountRef = useRef<boolean>(false);

  const [isVisible, setIsVisible] = useState<boolean>(visible);

  useEffect(() => {
    if (mountRef.current) {
      afterUpdate();
    } else {
      mountRef.current = true;
    }
  });

  const { ref, props } = useFlashTransition(value);

  const className =
    "mb-1 p-1 bg-light d-inline-block rounded components-grid-annotation text-break mw-100";

  return (
    <TooltipWrapper title="Toggle annotation value">
      <div
        className={`${className}${isVisible ? "" : " cursor-pointer"}`}
        onClick={isVisible ? undefined : () => setIsVisible(!isVisible)}
      >
        {isVisible ? (
          <>
            <span
              onClick={() => setIsVisible(false)}
              className="cursor-pointer"
            >
              <FontAwesomeIcon icon={faSearchMinus} className="me-1" />
              <span className="text-muted">{name}: </span>
            </span>
            <Linkify
              properties={{
                target: "_blank",
                rel: "noopener noreferrer",
              }}
            >
              <CSSTransition {...props}>
                {allowHTML ? (
                  <span
                    ref={ref}
                    dangerouslySetInnerHTML={{ __html: value }}
                  ></span>
                ) : (
                  <span ref={ref}>{value}</span>
                )}
              </CSSTransition>
            </Linkify>
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faSearchPlus} className="me-1" />
            {name}
          </>
        )}
      </div>
    </TooltipWrapper>
  );
});

const RenderLinkAnnotation: FC<{
  name: string;
  value: string;
}> = ({ name, value }) => {
  return (
    <a
      key={name}
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="components-label components-label-with-hover badge components-grid-annotation-link"
    >
      <FontAwesomeIcon icon={faExternalLinkAlt} /> {name}
    </a>
  );
};

export { RenderNonLinkAnnotation, RenderLinkAnnotation };
