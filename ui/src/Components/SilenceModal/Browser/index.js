import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import { debounce } from "lodash";

import Pagination from "react-js-pagination";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSortAmountDownAlt } from "@fortawesome/free-solid-svg-icons/faSortAmountDownAlt";
import { faSortAmountUp } from "@fortawesome/free-solid-svg-icons/faSortAmountUp";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons/faAngleLeft";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons/faAngleRight";
import { faAngleDoubleLeft } from "@fortawesome/free-solid-svg-icons/faAngleDoubleLeft";
import { faAngleDoubleRight } from "@fortawesome/free-solid-svg-icons/faAngleDoubleRight";

import { AlertStore, FormatBackendURI } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { FetchGet } from "Common/Fetch";
import { MountFade } from "Components/Animations/MountFade";
import { ManagedSilence } from "Components/ManagedSilence";

const FetchError = ({ message }) => (
  <div className="text-center">
    <h2 className="display-2 text-danger">
      <FontAwesomeIcon icon={faExclamationCircle} />
    </h2>
    <p className="lead text-muted">{message}</p>
  </div>
);
FetchError.propTypes = {
  message: PropTypes.node.isRequired
};

const Placeholder = ({ content }) => (
  <MountFade in={true}>
    <div className="jumbotron bg-transparent">
      <h1 className="display-5 text-placeholder text-center">{content}</h1>
    </div>
  </MountFade>
);
Placeholder.propTypes = {
  content: PropTypes.node.isRequired
};

const Browser = observer(
  class Browser extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      onDeleteModalClose: PropTypes.func.isRequired
    };

    fetchTimer = null;

    dataSource = observable(
      {
        silences: [],
        sortReverse: false,
        showExpired: false,
        searchTerm: "",
        error: null,
        fetch: null,
        done: false,
        setDone() {
          this.done = true;
        },
        setError(value) {
          this.error = value;
        },
        toggleSortReverse() {
          this.sortReverse = !this.sortReverse;
        },
        toggleShowExpired() {
          this.showExpired = !this.showExpired;
        },
        setSearchTerm(value) {
          this.searchTerm = value;
        }
      },
      {
        setDone: action.bound,
        setError: action.bound,
        toggleSortReverse: action.bound,
        toggleShowExpired: action.bound,
        setSearchTerm: action.bound
      }
    );

    onFetch = () => {
      const uri = FormatBackendURI(
        `silences.json?sortReverse=${
          this.dataSource.sortReverse ? "1" : "0"
        }&showExpired=${this.dataSource.showExpired ? "1" : "0"}&searchTerm=${
          this.dataSource.searchTerm
        }`
      );

      this.dataSource.fetch = FetchGet(uri, {})
        .then(result => {
          return result.json();
        })
        .then(result => {
          this.dataSource.silences = result;
          this.dataSource.setDone();
          this.dataSource.setError(null);
          this.pagination.resetIfNeeded(
            this.dataSource.silences.length,
            this.maxPerPage
          );
        })
        .catch(err => {
          console.trace(err);
          this.dataSource.setDone();
          return this.dataSource.setError(
            `Request failed with: ${err.message}`
          );
        });
    };

    onDebouncedFetch = debounce(this.onFetch, 500);

    maxPerPage = 5;

    pagination = observable(
      {
        activePage: 1,
        onPageChange(pageNumber) {
          this.activePage = pageNumber;
        },
        resetIfNeeded(totalItemsCount, maxPerPage) {
          const totalPages = Math.ceil(totalItemsCount / maxPerPage);
          if (this.activePage > totalPages) {
            this.activePage = Math.max(1, totalPages);
          }
        }
      },
      {
        onPageChange: action.bound,
        resetIfNeeded: action.bound
      }
    );

    componentDidMount() {
      const { settingsStore } = this.props;

      this.onFetch();
      this.fetchTimer = setInterval(
        this.onFetch,
        settingsStore.fetchConfig.config.interval * 1000
      );
    }

    componentWillUnmount() {
      clearInterval(this.fetchTimer);
      this.fetchTimer = null;
    }

    render() {
      const {
        alertStore,
        silenceFormStore,
        settingsStore,
        onDeleteModalClose
      } = this.props;

      return (
        <React.Fragment>
          <div
            className="d-flex flex-fill flex-lg-row flex-column justify-content-between mb-3"
            data-refresh={settingsStore.fetchConfig.config.interval}
          >
            <span className="custom-control custom-switch my-auto flex-grow-0 flex-shrink-0">
              <input
                id="silence-show-expired"
                className="custom-control-input"
                type="checkbox"
                value=""
                checked={this.dataSource.showExpired}
                onChange={() => {
                  this.dataSource.toggleShowExpired();
                  this.onDebouncedFetch();
                }}
              />
              <label
                className="custom-control-label cursor-pointer"
                htmlFor="silence-show-expired"
              >
                Show expired
              </label>
            </span>
            <input
              type="text"
              className="form-control flex-grow-1 flex-shrink-1 mx-lg-3 mx-0 my-lg-0 my-2"
              placeholder="Search query"
              value={this.dataSource.searchTerm}
              autoComplete="off"
              onChange={e => {
                this.dataSource.setSearchTerm(e.target.value);
                this.onDebouncedFetch();
              }}
            />
            <button
              type="button"
              className="btn btn-primary flex-grow-0 flex-shrink-0"
              onClick={() => {
                this.dataSource.toggleSortReverse();
                this.onDebouncedFetch();
              }}
            >
              <FontAwesomeIcon
                className="mr-1"
                icon={
                  this.dataSource.sortReverse
                    ? faSortAmountUp
                    : faSortAmountDownAlt
                }
              />
              Sort order
            </button>
          </div>
          {this.dataSource.error !== null ? (
            <FetchError message={this.dataSource.error} />
          ) : this.dataSource.done ? (
            this.dataSource.silences.length === 0 ? (
              <Placeholder content="Nothing to show" />
            ) : (
              <React.Fragment>
                {this.dataSource.silences
                  .slice(
                    (this.pagination.activePage - 1) * this.maxPerPage,
                    this.pagination.activePage * this.maxPerPage
                  )
                  .map(silence => (
                    <ManagedSilence
                      key={`${silence.cluster}/${silence.silence.id}`}
                      cluster={silence.cluster}
                      alertCount={silence.alertCount}
                      alertCountAlwaysVisible={true}
                      silence={silence.silence}
                      alertStore={alertStore}
                      silenceFormStore={silenceFormStore}
                      onDeleteModalClose={onDeleteModalClose}
                    />
                  ))}
                {this.dataSource.silences.length > this.maxPerPage ? (
                  <div className="mt-3">
                    <Pagination
                      activePage={this.pagination.activePage}
                      itemsCountPerPage={this.maxPerPage}
                      totalItemsCount={this.dataSource.silences.length}
                      pageRangeDisplayed={5}
                      onChange={this.pagination.onPageChange}
                      hideFirstLastPages={
                        this.dataSource.silences.length / this.maxPerPage < 20
                      }
                      innerClass="pagination justify-content-center"
                      itemClass="page-item"
                      linkClass="page-link"
                      activeClass="active"
                      activeLinkClass="font-weight-bold"
                      prevPageText={<FontAwesomeIcon icon={faAngleLeft} />}
                      nextPageText={<FontAwesomeIcon icon={faAngleRight} />}
                      firstPageText={
                        <FontAwesomeIcon icon={faAngleDoubleLeft} />
                      }
                      lastPageText={
                        <FontAwesomeIcon icon={faAngleDoubleRight} />
                      }
                    />
                  </div>
                ) : null}
              </React.Fragment>
            )
          ) : (
            <Placeholder
              content={<FontAwesomeIcon icon={faSpinner} size="lg" spin />}
            />
          )}
        </React.Fragment>
      );
    }
  }
);

export { Browser };
