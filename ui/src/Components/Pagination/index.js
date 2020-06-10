import React, { useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";

import { HotKeys } from "react-hotkeys";

import Pagination from "react-js-pagination";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons/faAngleLeft";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons/faAngleRight";
import { faAngleDoubleLeft } from "@fortawesome/free-solid-svg-icons/faAngleDoubleLeft";
import { faAngleDoubleRight } from "@fortawesome/free-solid-svg-icons/faAngleDoubleRight";

import { IsMobile } from "Common/Device";

const PageSelect = ({
  totalItemsCount,
  totalPages,
  maxPerPage,
  initialPage,
  setPageCallback,
}) => {
  const [activePage, setActivePage] = useState(initialPage);

  useEffect(() => {
    if (activePage > totalPages) {
      const page = Math.max(1, totalPages);
      setActivePage(page);
      setPageCallback(page);
    }
  }, [activePage, maxPerPage, totalPages, setPageCallback]);

  const onChange = useCallback(
    (page) => {
      setActivePage(page);
      setPageCallback(page);
    },
    [setPageCallback]
  );

  const onPageUp = useCallback(() => {
    const page = Math.min(activePage + 1, totalPages);
    setActivePage(page);
    setPageCallback(page);
  }, [activePage, setPageCallback, totalPages]);

  const onPageDown = useCallback(() => {
    const page = Math.max(activePage - 1, 1);
    setActivePage(page);
    setPageCallback(page);
  }, [activePage, setPageCallback]);

  return (
    <HotKeys
      className="components-pagination"
      innerRef={(r) => r && r.focus()}
      keyMap={{
        onArrowLeft: "ArrowLeft",
        onArrowRight: "ArrowRight",
      }}
      handlers={{
        onArrowLeft: onPageDown,
        onArrowRight: onPageUp,
      }}
      allowChanges
    >
      {totalItemsCount > maxPerPage ? (
        <div className="mt-3">
          <Pagination
            activePage={activePage}
            itemsCountPerPage={maxPerPage}
            totalItemsCount={totalItemsCount}
            pageRangeDisplayed={IsMobile() ? 3 : 5}
            onChange={onChange}
            hideFirstLastPages={totalPages < 10}
            innerClass="pagination justify-content-center"
            itemClass="page-item"
            linkClass="page-link"
            activeClass="active"
            activeLinkClass="font-weight-bold"
            prevPageText={<FontAwesomeIcon icon={faAngleLeft} />}
            nextPageText={<FontAwesomeIcon icon={faAngleRight} />}
            firstPageText={<FontAwesomeIcon icon={faAngleDoubleLeft} />}
            lastPageText={<FontAwesomeIcon icon={faAngleDoubleRight} />}
          />
        </div>
      ) : null}
    </HotKeys>
  );
};
PageSelect.propTypes = {
  totalPages: PropTypes.number.isRequired,
  initialPage: PropTypes.number,
  maxPerPage: PropTypes.number.isRequired,
  totalItemsCount: PropTypes.number.isRequired,
  setPageCallback: PropTypes.func.isRequired,
};
PageSelect.defaultProps = {
  initialPage: 1,
};

export { PageSelect };
