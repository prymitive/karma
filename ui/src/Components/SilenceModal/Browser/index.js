import React, { useEffect, useCallback } from "react";
import PropTypes from "prop-types";

import { useObserver, useLocalStore } from "mobx-react";

import debounce from "lodash/debounce";

import { Fade } from "react-reveal";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSortAmountDownAlt } from "@fortawesome/free-solid-svg-icons/faSortAmountDownAlt";
import { faSortAmountUp } from "@fortawesome/free-solid-svg-icons/faSortAmountUp";

import { AlertStore, FormatBackendURI } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { FetchGet } from "Common/Fetch";
import { IsMobile } from "Common/Device";
import { ManagedSilence } from "Components/ManagedSilence";
import { PageSelect } from "Components/Pagination";
import { ThemeContext } from "Components/Theme";

const FetchError = ({ message }) => (
  <div className="text-center">
    <h2 className="display-2 text-danger">
      <FontAwesomeIcon icon={faExclamationCircle} />
    </h2>
    <p className="lead text-muted">{message}</p>
  </div>
);
FetchError.propTypes = {
  message: PropTypes.node.isRequired,
};

const Placeholder = ({ content }) => {
  const theme = React.useContext(ThemeContext);

  return (
    <Fade in={theme.animations.in} duration={theme.animations.duration}>
      <div className="jumbotron bg-transparent">
        <h1 className="display-5 text-placeholder text-center">{content}</h1>
      </div>
    </Fade>
  );
};
Placeholder.propTypes = {
  content: PropTypes.node.isRequired,
};

const Browser = ({
  alertStore,
  silenceFormStore,
  settingsStore,
  onDeleteModalClose,
}) => {
  const dataSource = useLocalStore(() => ({
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
    },
  }));

  const maxPerPage = IsMobile() ? 4 : 6;

  const pagination = useLocalStore(() => ({
    activePage: 1,
    onPageChange(pageNumber) {
      this.activePage = pageNumber;
    },
    resetIfNeeded(totalItemsCount, maxPerPage) {
      const totalPages = Math.ceil(totalItemsCount / maxPerPage);
      if (this.activePage > totalPages) {
        this.activePage = Math.max(1, totalPages);
      }
    },
  }));

  const onFetch = useCallback(() => {
    const uri = FormatBackendURI(
      `silences.json?sortReverse=${
        dataSource.sortReverse ? "1" : "0"
      }&showExpired=${dataSource.showExpired ? "1" : "0"}&searchTerm=${
        dataSource.searchTerm
      }`
    );

    dataSource.fetch = FetchGet(uri, {})
      .then((result) => {
        return result.json();
      })
      .then((result) => {
        dataSource.silences = result;
        dataSource.setDone();
        dataSource.setError(null);
        pagination.resetIfNeeded(dataSource.silences.length, maxPerPage);
      })
      .catch((err) => {
        console.trace(err);
        dataSource.setDone();
        return dataSource.setError(`Request failed with: ${err.message}`);
      });
  }, [dataSource, maxPerPage, pagination]);

  const onDebouncedFetch = debounce(onFetch, 500);

  useEffect(() => {
    onFetch();
    const timer = setInterval(() => {
      onFetch();
    }, settingsStore.fetchConfig.config.interval * 1000);
    return () => clearInterval(timer);
  }, [onFetch, settingsStore.fetchConfig.config.interval]);

  return useObserver(() => (
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
            checked={dataSource.showExpired}
            onChange={() => {
              dataSource.toggleShowExpired();
              onDebouncedFetch();
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
          value={dataSource.searchTerm}
          autoComplete="off"
          onChange={(e) => {
            dataSource.setSearchTerm(e.target.value);
            onDebouncedFetch();
          }}
        />
        <button
          type="button"
          className="btn btn-secondary flex-grow-0 flex-shrink-0"
          onClick={() => {
            dataSource.toggleSortReverse();
            onDebouncedFetch();
          }}
        >
          <FontAwesomeIcon
            className="mr-1"
            icon={dataSource.sortReverse ? faSortAmountUp : faSortAmountDownAlt}
          />
          Sort order
        </button>
      </div>
      {dataSource.error !== null ? (
        <FetchError message={dataSource.error} />
      ) : dataSource.done ? (
        dataSource.silences.length === 0 ? (
          <Placeholder content="Nothing to show" />
        ) : (
          <React.Fragment>
            {dataSource.silences
              .slice(
                (pagination.activePage - 1) * maxPerPage,
                pagination.activePage * maxPerPage
              )
              .map((silence) => (
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
          </React.Fragment>
        )
      ) : (
        <Placeholder
          content={<FontAwesomeIcon icon={faSpinner} size="lg" spin />}
        />
      )}
      <PageSelect
        totalPages={Math.ceil(dataSource.silences.length / maxPerPage)}
        activePage={pagination.activePage}
        maxPerPage={maxPerPage}
        totalItemsCount={dataSource.silences.length}
        setPageCallback={pagination.onPageChange}
      />
    </React.Fragment>
  ));
};
Browser.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired,
  onDeleteModalClose: PropTypes.func.isRequired,
};

export { Browser };
