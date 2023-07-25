import type { FC } from "react";

import type { AlertStore } from "Stores/AlertStore";
import { FormatQuery, QueryOperators, StaticLabels } from "Common/Query";
import { PaginatedAlertList } from "Components/PaginatedAlertList";

const formatQuery = (fingerprints: string[]): string => {
  if (fingerprints.length === 1) {
    return FormatQuery(
      StaticLabels.Fingerprint,
      QueryOperators.Equal,
      fingerprints[0],
    );
  }
  return FormatQuery(
    StaticLabels.Fingerprint,
    QueryOperators.Regex,
    `^(${fingerprints.join("|")})$`,
  );
};

const InhibitedByModalContent: FC<{
  alertStore: AlertStore;
  fingerprints: string[];
  onHide: () => void;
}> = ({ alertStore, fingerprints, onHide }) => {
  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">Inhibiting alerts</h5>
        <button type="button" className="btn-close" onClick={onHide}></button>
      </div>
      <div className="modal-body">
        <PaginatedAlertList
          alertStore={alertStore}
          filters={[formatQuery(fingerprints)]}
        />
      </div>
    </>
  );
};

export { InhibitedByModalContent };
