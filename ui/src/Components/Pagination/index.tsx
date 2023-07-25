import { useState, useEffect, FC } from "react";

import { useHotkeys } from "react-hotkeys-hook";

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
  const [pages, setPages] = useState<number[]>([]);
  const [activePage, setActivePage] = useState<number>(initialPage);

  const onChange = (page: number) => {
    setActivePage(page);
    setPageCallback(page);
  };

  useEffect(() => {
    const allPages = Array.from(Array(totalPages).keys()).map((k) => k + 1);
    const gap = IsMobile() ? 1 : 2;

    let minPage = activePage - gap;
    let maxPage = activePage + gap;
    if (minPage < 1) {
      maxPage = Math.min(maxPage + -minPage + 1, totalPages);
      minPage = 1;
    }
    if (maxPage > totalPages) {
      minPage = Math.max(1, minPage - (maxPage - totalPages));
      maxPage = totalPages;
    }
    setPages(allPages.slice(minPage - 1, maxPage));
  }, [activePage, totalPages]);

  useEffect(() => {
    if (activePage > totalPages) {
      const page = Math.max(1, totalPages);
      setActivePage(page);
      setPageCallback(page);
    }
  }, [activePage, totalPages, setPageCallback]);

  useHotkeys(
    "left",
    () => {
      const page = Math.max(activePage - 1, 1);
      setActivePage(page);
      setPageCallback(page);
    },
    {},
    [activePage, setActivePage, setPageCallback],
  );

  useHotkeys(
    "right",
    () => {
      const page = Math.min(activePage + 1, totalPages);
      setActivePage(page);
      setPageCallback(page);
    },
    {},
    [activePage, totalPages, setActivePage, setPageCallback],
  );

  return (
    <div className="components-pagination">
      {totalItemsCount > maxPerPage ? (
        <ul className="pagination justify-content-center mt-3">
          {totalPages >= 10 ? (
            <li className={`page-item ${activePage > 1 ? "" : "disabled"}`}>
              <button className="page-link" onClick={() => onChange(1)}>
                <FontAwesomeIcon icon={faAngleDoubleLeft} />
              </button>
            </li>
          ) : null}
          <li className={`page-item ${activePage > 1 ? "" : "disabled"}`}>
            <button
              className="page-link"
              onClick={() => onChange(Math.max(1, activePage - 1))}
            >
              <FontAwesomeIcon icon={faAngleLeft} />
            </button>
          </li>
          {pages.map((page) => (
            <li
              key={page}
              className={`page-item ${
                page === activePage ? "active font-weight-bold" : ""
              }`}
            >
              <button
                className={`page-link ${page === activePage ? "active" : ""}`}
                onClick={() => onChange(page)}
              >
                {page}
              </button>
            </li>
          ))}
          <li
            className={`page-item ${activePage < totalPages ? "" : "disabled"}`}
          >
            <button
              className="page-link"
              onClick={() => onChange(Math.min(activePage + 1, totalPages))}
            >
              <FontAwesomeIcon icon={faAngleRight} />
            </button>
          </li>
          {totalPages >= 10 ? (
            <li
              className={`page-item ${
                activePage < totalPages ? "" : "disabled"
              }`}
            >
              <button
                className="page-link"
                onClick={() => onChange(totalPages)}
              >
                <FontAwesomeIcon icon={faAngleDoubleRight} />
              </button>
            </li>
          ) : null}
          {/*           <Pagination
            activePage={activePage}
            itemsCountPerPage={maxPerPage}
            totalItemsCount={totalItemsCount}
            pageRangeDisplayed={IsMobile() ? 3 : 5}
          /> */}
        </ul>
      ) : null}
    </div>
  );
};

export { PageSelect };
