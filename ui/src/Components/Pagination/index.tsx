import { useState, useEffect, FC } from "react";

import { useHotkeys } from "react-hotkeys-hook";

import Pagination from "react-js-pagination";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons/faAngleLeft";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons/faAngleRight";
import { faAngleDoubleLeft } from "@fortawesome/free-solid-svg-icons/faAngleDoubleLeft";
import { faAngleDoubleRight } from "@fortawesome/free-solid-svg-icons/faAngleDoubleRight";

import { IsMobile } from "Common/Device";

type PageCallback = (page: number) => void;

const PageSelect: FC<{
  totalItemsCount: number;
  totalPages: number;
  maxPerPage: number;
  initialPage?: number;
  setPageCallback: PageCallback;
}> = ({
  totalItemsCount,
  totalPages,
  maxPerPage,
  initialPage = 1,
  setPageCallback,
}) => {
  const [activePage, setActivePage] = useState<number>(initialPage);

  const onChange = (page: number) => {
    setActivePage(page);
    setPageCallback(page);
  };

  useEffect(() => {
    if (activePage > totalPages) {
      const page = Math.max(1, totalPages);
      setActivePage(page);
      setPageCallback(page);
    }
  }, [activePage, maxPerPage, totalPages, setPageCallback]);

  useHotkeys(
    "left",
    () => {
      const page = Math.max(activePage - 1, 1);
      setActivePage(page);
      setPageCallback(page);
    },
    {},
    [activePage, setActivePage, setPageCallback]
  );

  useHotkeys(
    "right",
    () => {
      const page = Math.min(activePage + 1, totalPages);
      setActivePage(page);
      setPageCallback(page);
    },
    {},
    [activePage, totalPages, setActivePage, setPageCallback]
  );

  return (
    <div className="components-pagination">
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
    </div>
  );
};

export { PageSelect };
