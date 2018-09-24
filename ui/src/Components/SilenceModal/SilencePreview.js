import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import JSONPretty from "react-json-pretty";
import "react-json-pretty/src/JSONPretty.monikai.css";

import { SilenceFormStore } from "Stores/SilenceFormStore";

const SilencePreview = observer(
  class SilencePreview extends Component {
    static propTypes = {
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired
    };

    render() {
      const { silenceFormStore } = this.props;

      return (
        <div className="mt-3">
          <JSONPretty json={silenceFormStore.data.toAlertmanagerPayload} />
        </div>
      );
    }
  }
);

export { SilencePreview };
