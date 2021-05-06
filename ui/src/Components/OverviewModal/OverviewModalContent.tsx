import { FC, useState } from "react";

import { observer } from "mobx-react-lite";

import { APILabelCounterT } from "Models/APITypes";
import { AlertStore } from "Stores/AlertStore";
import { TooltipWrapper } from "Components/TooltipWrapper";
import LabelWithPercent from "Components/Labels/LabelWithPercent";
import { ToggleIcon } from "Components/ToggleIcon";

const TableRows: FC<{
  alertStore: AlertStore;
  nameStats: APILabelCounterT[];
}> = observer(({ alertStore, nameStats }) => (
  <>
    {nameStats.map((nameStats) => (
      <tr key={nameStats.name}>
        <td width="25%" className="text-nowrap mw-100 p-1">
          <span className="badge bg-light components-label mx-0 mt-0 mb-auto ps-0 text-start">
            <span className="bg-primary text-white me-1 px-1 components-labelWithPercent-percent">
              {nameStats.hits}
            </span>
            {nameStats.name}
          </span>
        </td>
        <td width="75%" className="mw-100 p-1">
          {nameStats.values.slice(0, 9).map((valueStats) => (
            <LabelWithPercent
              alertStore={alertStore}
              key={valueStats.value}
              name={nameStats.name}
              value={valueStats.value}
              hits={valueStats.hits}
              percent={valueStats.percent}
              offset={valueStats.offset}
              isActive={
                alertStore.filters.values.filter(
                  (f) => f.raw === valueStats.raw
                ).length > 0
              }
            />
          ))}
          {nameStats.values.length > 9 ? (
            <div className="components-label badge my-2 text-muted mw-100">
              +{nameStats.values.length - 9} more
            </div>
          ) : null}
        </td>
      </tr>
    ))}
  </>
));

const LabelsTable: FC<{
  alertStore: AlertStore;
  showAllLabels: boolean;
  toggleAllLabels: () => void;
}> = observer(({ alertStore, showAllLabels, toggleAllLabels }) => (
  <>
    <table
      className="table table-borderless top-labels"
      style={{ tableLayout: "fixed" }}
    >
      <tbody className="mw-100">
        <TableRows
          alertStore={alertStore}
          nameStats={alertStore.data.counters.filter(
            (nameStats) => nameStats.hits >= alertStore.info.totalAlerts
          )}
        ></TableRows>
        {alertStore.data.counters.filter(
          (nameStats) => nameStats.hits < alertStore.info.totalAlerts
        ).length > 0 ? (
          <tr>
            <td colSpan={2} className="px-1 py-0">
              <TooltipWrapper title="Toggle all / only common labels">
                <span
                  className="badge components-label cursor-pointer with-click"
                  onClick={toggleAllLabels}
                >
                  <ToggleIcon isOpen={showAllLabels} className="text-muted" />
                </span>
              </TooltipWrapper>
            </td>
          </tr>
        ) : null}
        {showAllLabels ? (
          <TableRows
            alertStore={alertStore}
            nameStats={alertStore.data.counters.filter(
              (nameStats) => nameStats.hits < alertStore.info.totalAlerts
            )}
          ></TableRows>
        ) : null}
      </tbody>
    </table>
  </>
));

const NothingToShow: FC = () => (
  <div className="px-2 py-5 bg-transparent">
    <h1 className="display-5 text-placeholder text-center">
      No labels to display
    </h1>
  </div>
);

const OverviewModalContent: FC<{
  alertStore: AlertStore;
  onHide: () => void;
}> = observer(({ alertStore, onHide }) => {
  const [showAllLabels, setShowAllLabels] = useState<boolean>(false);
  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">Overview</h5>
        <button type="button" className="btn-close" onClick={onHide}></button>
      </div>
      <div className="modal-body">
        {alertStore.data.counters.length === 0 ? (
          <NothingToShow />
        ) : (
          <LabelsTable
            alertStore={alertStore}
            showAllLabels={showAllLabels}
            toggleAllLabels={() => setShowAllLabels(!showAllLabels)}
          />
        )}
      </div>
    </>
  );
});

export { OverviewModalContent };
