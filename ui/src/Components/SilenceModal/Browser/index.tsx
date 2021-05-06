import React, { FC, useState, useEffect, ReactNode } from "react";

import { observer } from "mobx-react-lite";

import TransitionGroup from "react-transition-group/TransitionGroup";
import { CSSTransition } from "react-transition-group";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faSortAmountDownAlt } from "@fortawesome/free-solid-svg-icons/faSortAmountDownAlt";
import { faSortAmountUp } from "@fortawesome/free-solid-svg-icons/faSortAmountUp";

import { APIManagedSilenceT } from "Models/APITypes";
import { AlertStore, FormatBackendURI } from "Stores/AlertStore";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { Settings } from "Stores/Settings";
import { useFetchGet, FetchGetOptionsT } from "Hooks/useFetchGet";
import { useDebounce } from "Hooks/useDebounce";
import { IsMobile } from "Common/Device";
import { ManagedSilence } from "Components/ManagedSilence";
import { PageSelect } from "Components/Pagination";
import { ThemeContext } from "Components/Theme";

const FetchError: FC<{
  message: ReactNode;
}> = ({ message }) => (
  <div className="text-center">
    <h2 className="display-2 text-danger">
      <FontAwesomeIcon icon={faExclamationCircle} />
    </h2>
    <p className="lead text-muted">{message}</p>
  </div>
);

const Placeholder: FC<{
  content: ReactNode;
}> = ({ content }) => {
  const context = React.useContext(ThemeContext);

  return (
    <CSSTransition
      in={true}
      appear={true}
      classNames="components-animation-fade"
      timeout={context.animations.duration}
    >
      <div className="px-2 py-5 bg-transparent">
        <h1 className="display-5 text-placeholder text-center">{content}</h1>
      </div>
    </CSSTransition>
  );
};

const Browser: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  settingsStore: Settings;
}> = ({ alertStore, silenceFormStore, settingsStore }) => {
  const maxPerPage = IsMobile() ? 4 : 6;
  const [sortReverse, setSortReverse] = useState<boolean>(false);
  const [showExpired, setShowExpired] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activePage, setActivePage] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(
    Math.floor(Date.now() / 1000)
  );

  const debouncedSearchTerm = useDebounce<string>(searchTerm, 500);

  const { response, error, isLoading, isRetrying } = useFetchGet<
    APIManagedSilenceT[]
  >(
    FormatBackendURI(
      `silences.json?sortReverse=${sortReverse ? "1" : "0"}&showExpired=${
        showExpired ? "1" : "0"
      }&searchTerm=${debouncedSearchTerm}`
    ),
    { deps: [currentTime] } as FetchGetOptionsT
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, settingsStore.fetchConfig.config.interval * 1000);
    return () => clearInterval(timer);
  }, [settingsStore.fetchConfig.config.interval]);

  const context = React.useContext(ThemeContext);

  return (
    <>
      <div
        className="d-flex flex-fill flex-lg-row flex-column justify-content-between mb-3"
        data-refresh={settingsStore.fetchConfig.config.interval}
      >
        <span className="form-check form-switch my-auto flex-grow-0 flex-shrink-0">
          <input
            id="silence-show-expired"
            className="form-check-input"
            type="checkbox"
            value=""
            checked={showExpired}
            onChange={() => setShowExpired(!showExpired)}
          />
          <label
            className="form-check-label cursor-pointer"
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
            className="me-1"
            icon={sortReverse ? faSortAmountUp : faSortAmountDownAlt}
          />
          Sort order
        </button>
      </div>
      {isLoading && response === null ? (
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
      ) : error !== null ? (
        <FetchError message={error} />
      ) : response === null || response.length === 0 ? (
        <Placeholder content="Nothing to show" />
      ) : (
        <>
          <TransitionGroup component={null} appear enter exit={false}>
            {response
              .slice((activePage - 1) * maxPerPage, activePage * maxPerPage)
              .map((silence) => (
                <CSSTransition
                  key={`${silence.cluster}/${silence.silence.id}`}
                  classNames="components-animation-fade"
                  timeout={context.animations.duration}
                  unmountOnExit
                >
                  <ManagedSilence
                    cluster={silence.cluster}
                    alertCount={silence.alertCount}
                    alertCountAlwaysVisible={true}
                    silence={silence.silence}
                    alertStore={alertStore}
                    silenceFormStore={silenceFormStore}
                    isNested={true}
                  />
                </CSSTransition>
              ))}
          </TransitionGroup>
          <PageSelect
            totalPages={Math.ceil(response.length / maxPerPage)}
            maxPerPage={maxPerPage}
            totalItemsCount={response.length}
            setPageCallback={setActivePage}
          />
        </>
      )}
    </>
  );
};

export default observer(Browser);
