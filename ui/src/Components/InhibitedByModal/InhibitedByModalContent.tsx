import React, { FC } from "react";

import { AlertStore } from "Stores/AlertStore";
import { FormatQuery, QueryOperators, StaticLabels } from "Common/Query";
import { PaginatedAlertList } from "Components/PaginatedAlertList";

const InhibitedByModalContent: FC<{
  alertStore: AlertStore;
  fingerprints: string[];
  onHide: () => void;
}> = ({ alertStore, fingerprints, onHide }) => {
  return (
    <React.Fragment>
      <div className="modal-header">
        <h5 className="modal-title">Inhibiting alerts</h5>
        <button type="button" className="close" onClick={onHide}>
          <span className="align-middle">&times;</span>
        </button>
      </div>
      <div className="modal-body">
        <PaginatedAlertList
          alertStore={alertStore}
          filters={[
            FormatQuery(
              StaticLabels.Fingerprint,
              QueryOperators.Regex,
              `^(${fingerprints.join("|")})$`
            ),
          ]}
        />
      </div>
    </React.Fragment>
  );
};

export { InhibitedByModalContent };
