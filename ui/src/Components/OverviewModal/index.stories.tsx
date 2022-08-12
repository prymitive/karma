import type { FC } from "react";

import { storiesOf } from "@storybook/react";

import fetchMock from "fetch-mock";

import { MockGrid } from "../../__fixtures__/Stories";
import { AlertStore } from "../../Stores/AlertStore";
import { OverviewModalContent } from "./OverviewModalContent";

import "Styles/Percy.scss";

storiesOf("OverviewModal", module).add("OverviewModal", () => {
  const Modal: FC = ({ children }) => (
    <div className="modal d-block" style={{ position: "relative" }}>
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );

  fetchMock.mock(
    "begin:/counters.json?q=full",
    {
      total: 0,
      counters: [
        {
          name: "@receiver",
          hits: 2,
          values: [
            {
              value: "by-cluster-service",
              raw: "@receiver=by-cluster-service",
              hits: 2,
              percent: 100,
              offset: 0,
            },
          ],
        },
        {
          name: "alertname",
          hits: 90,
          values: [
            {
              value: "Fake Alert",
              raw: "alertname=Fake Alert",
              hits: 45,
              percent: 50,
              offset: 0,
            },
            {
              value: "Second Fake Alert",
              raw: "alertname=Second Fake Alert",
              hits: 45,
              percent: 50,
              offset: 50,
            },
          ],
        },
        {
          name: "group",
          hits: 100,
          values: [
            {
              value: "group1",
              raw: "group=group1",
              hits: 25,
              percent: 25,
              offset: 0,
            },
            {
              value: "group2",
              raw: "group=group2",
              hits: 70,
              percent: 70,
              offset: 25,
            },
            {
              value: "group3",
              raw: "group=group3",
              hits: 4,
              percent: 4,
              offset: 95,
            },
            {
              value: "group4",
              raw: "group=group4",
              hits: 1,
              percent: 1,
              offset: 99,
            },
          ],
        },
      ],
    },
    {
      overwriteRoutes: true,
    }
  );
  fetchMock.mock(
    "begin:/counters.json?q=empty",
    {
      total: 0,
      counters: [],
    },
    {
      overwriteRoutes: true,
    }
  );

  const alertStore = new AlertStore(["full"]);
  MockGrid(alertStore);

  const emptyAlertStore = new AlertStore(["empty"]);

  return (
    <div>
      <Modal>
        <OverviewModalContent alertStore={alertStore} onHide={() => {}} />
      </Modal>
      <Modal>
        <OverviewModalContent alertStore={emptyAlertStore} onHide={() => {}} />
      </Modal>
    </div>
  );
});
