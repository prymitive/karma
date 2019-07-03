import React from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar } from "@fortawesome/free-regular-svg-icons/faChartBar";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { TopLabel } from "Components/Labels/TopLabel";

import "./index.scss";

const TopLabels = observer(props => {
  const topLabels = props.alertStore.data.counters.filter(
    topLabel =>
      topLabel.percent !== 100 &&
      topLabel.percent >= props.settingsStore.topLabelsConfig.config.minPercent
  );

  if (
    props.settingsStore.topLabelsConfig.config.show === false ||
    topLabels.length === 0
  ) {
    return null;
  }

  return (
    <div className="components-toplabels m-1 bg-secondary rounded d-flex flex-row">
      <div className="flex-grow-0 flex-shrink-0 pl-1 d-none d-sm-block">
        <TooltipWrapper title="Top labels">
          <span>
            <FontAwesomeIcon icon={faChartBar} className="text-white" />
          </span>
        </TooltipWrapper>
      </div>
      <div className="pl-1 flex-grow-1 flex-shrink-1 components-toplabels-labels">
        {topLabels.map(topLabel => (
          <TopLabel
            key={`${topLabel.name}/${topLabel.value}`}
            name={topLabel.name}
            value={topLabel.value}
            hits={topLabel.hits}
            percent={Math.round(topLabel.percent)}
          />
        ))}
      </div>
      <div className="flex-grow-0 flex-shrink-0 px-1">
        <span>
          <FontAwesomeIcon
            icon={faTimes}
            className="cursor-pointer close"
            onClick={() => {
              props.settingsStore.topLabelsConfig.config.show = false;
            }}
          />
        </span>
      </div>
    </div>
  );
});
TopLabels.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  settingsStore: PropTypes.instanceOf(Settings).isRequired
};

export { TopLabels };
