import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react";

import { motion } from "framer-motion";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSortAmountDownAlt } from "@fortawesome/free-solid-svg-icons/faSortAmountDownAlt";
import { faSortAmountUp } from "@fortawesome/free-solid-svg-icons/faSortAmountUp";

import { AlertStore, FormatBackendURI } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { useFetchGet } from "Hooks/useFetchGet";
import { useDebounce } from "Hooks/useDebounce";
import { IsMobile } from "Common/Device";
import { ManagedSilence } from "Components/ManagedSilence";
import { PageSelect } from "Components/Pagination";

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
  return (
    <motion.div
      animate={{ opacity: [0, 1] }}
      className="jumbotron bg-transparent"
    >
      <h1 className="display-5 text-placeholder text-center">{content}</h1>
    </motion.div>
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
  const maxPerPage = IsMobile() ? 4 : 6;
  const [sortReverse, setSortReverse] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const {
    response,
    error,
    isLoading,
    isRetrying,
  } = useFetchGet(
    FormatBackendURI(
      `silences.json?sortReverse=${sortReverse ? "1" : "0"}&showExpired=${
        showExpired ? "1" : "0"
      }&searchTerm=${debouncedSearchTerm}`
    ),
    { deps: [currentTime] }
  );

  useEffect(() => {
    if (response) {
      const totalPages = Math.ceil(response.length / maxPerPage);
      if (activePage > totalPages) {
        setActivePage(Math.max(1, totalPages));
      }
    }
  }, [activePage, maxPerPage, response]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, settingsStore.fetchConfig.config.interval * 1000);
    return () => clearInterval(timer);
  }, [settingsStore.fetchConfig.config.interval]);

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
            checked={showExpired}
            onChange={() => setShowExpired(!showExpired)}
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
          value={searchTerm}
          autoComplete="off"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary flex-grow-0 flex-shrink-0"
          onClick={() => setSortReverse(!sortReverse)}
        >
          <FontAwesomeIcon
            className="mr-1"
            icon={sortReverse ? faSortAmountUp : faSortAmountDownAlt}
          />
          Sort order
        </button>
      </div>
      {response === null && isLoading ? (
        <Placeholder
          content={
            <FontAwesomeIcon
              icon={faSpinner}
              size="lg"
              spin
              className={isRetrying ? "text-danger" : ""}
            />
          }
        />
      ) : error ? (
        <FetchError message={error} />
      ) : response.length === 0 ? (
        <Placeholder content="Nothing to show" />
      ) : (
        <React.Fragment>
          {response
            .slice((activePage - 1) * maxPerPage, activePage * maxPerPage)
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
          <PageSelect
            totalPages={Math.ceil(response.length / maxPerPage)}
            activePage={activePage}
            maxPerPage={maxPerPage}
            totalItemsCount={response.length}
            setPageCallback={setActivePage}
          />
        </React.Fragment>
      )}
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
