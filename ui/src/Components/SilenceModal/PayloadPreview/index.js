import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import JSONPretty from "react-json-pretty";
import * as theme from "react-json-pretty/dist/monikai";

import { SilenceFormStore } from "Stores/SilenceFormStore";

const PayloadPreview = observer(
  class PayloadPreview extends Component {
    static propTypes = {
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
    };

    render() {
      const { silenceFormStore } = this.props;

      return (
        <div className="mt-3">
          <JSONPretty
            json={silenceFormStore.data.toAlertmanagerPayload}
            theme={theme}
          />
        </div>
      );
    }
  }
);

export { PayloadPreview };
