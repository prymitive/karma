import React, { Component } from "react";
import PropTypes from "prop-types";

import { observer } from "mobx-react";

import { AlertStore } from "Stores/AlertStore";
import { AlertGrid } from "./AlertGrid";
import { BlankPage } from "./BlankPage";
import { FatalError } from "./FatalError";
import { UpstreamError } from "./UpstreamError";

const Grid = observer(
  class Grid extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired
    };

    render() {
      const { alertStore } = this.props;

      if (alertStore.status.error) {
        return <FatalError message={alertStore.status.error} />;
      }

      if (Object.keys(alertStore.data.groups).length === 0) {
        return <BlankPage />;
      }

      return (
        <React.Fragment>
          {alertStore.data.upstreams.instances
            .filter(upstream => upstream.error !== "")
            .map(upstream => (
              <UpstreamError
                key={upstream.name}
                name={upstream.name}
                message={upstream.error}
              />
            ))}

          <AlertGrid alertStore={alertStore} />
        </React.Fragment>
      );
    }
  }
);

export { Grid };
