import React from "react";
import PropTypes from "prop-types";

import { useObserver } from "mobx-react-lite";

import { QueryOperators } from "Common/Query";
import { AlertStore } from "Stores/AlertStore";
import { GetClassAndStyle } from "Components/Labels/Utils";

const HistoryLabel = ({ alertStore, name, matcher, value }) => {
  const cs = GetClassAndStyle(
    alertStore,
    matcher === QueryOperators.Equal ? name : "",
    matcher === QueryOperators.Equal ? value : "",
    "components-label-history components-label-value"
  );

  return useObserver(() => (
    <span className={cs.className} style={cs.style}>
      {name ? `${name}${matcher}` : null}
      {value}
    </span>
  ));
};
HistoryLabel.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  matcher: PropTypes.string.isRequired,
};

export { HistoryLabel };
