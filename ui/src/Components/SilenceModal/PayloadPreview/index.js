import React from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react";

import JSONPretty from "react-json-pretty";
import * as theme from "react-json-pretty/dist/monikai";

import { SilenceFormStore } from "Stores/SilenceFormStore";

const PayloadPreview = ({ silenceFormStore }) => {
  return useObserver(() => (
    <div className="mt-3">
      <JSONPretty
        json={silenceFormStore.data.toAlertmanagerPayload}
        theme={theme}
      />
    </div>
  ));
};
PayloadPreview.propTypes = {
  silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
};

export { PayloadPreview };
