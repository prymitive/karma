import React, { Component } from "react";
import PropTypes from "prop-types";

import { HotKeys } from "react-hotkeys";

import Pagination from "react-js-pagination";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons/faAngleLeft";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons/faAngleRight";
import { faAngleDoubleLeft } from "@fortawesome/free-solid-svg-icons/faAngleDoubleLeft";
import { faAngleDoubleRight } from "@fortawesome/free-solid-svg-icons/faAngleDoubleRight";

class PageSelect extends Component {
  static propTypes = {
    totalPages: PropTypes.number.isRequired,
    activePage: PropTypes.number.isRequired,
    maxPerPage: PropTypes.number.isRequired,
    totalItemsCount: PropTypes.number.isRequired,
    setPageCallback: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.HotKeysRef = React.createRef();
  }

  onPageUp = () => {
    const { setPageCallback, activePage, totalPages } = this.props;
    setPageCallback(Math.min(activePage + 1, totalPages));
  };

  onPageDown = () => {
    const { setPageCallback, activePage } = this.props;
    setPageCallback(Math.max(activePage - 1, 1));
  };

  componentDidMount() {
    this.HotKeysRef.current.focus();
  }

  render() {
    const {
      totalItemsCount,
      totalPages,
      maxPerPage,
      activePage,
      setPageCallback,
    } = this.props;

    return (
      <HotKeys
        className="components-pagination"
        innerRef={this.HotKeysRef}
        keyMap={{
          onArrowLeft: "ArrowLeft",
          onArrowRight: "ArrowRight",
        }}
        handlers={{
          onArrowLeft: this.onPageDown,
          onArrowRight: this.onPageUp,
        }}
      >
        {totalItemsCount > maxPerPage ? (
          <div className="mt-3">
            <Pagination
              activePage={activePage}
              itemsCountPerPage={maxPerPage}
              totalItemsCount={totalItemsCount}
              pageRangeDisplayed={5}
              onChange={setPageCallback}
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
  }
}

export { PageSelect };
