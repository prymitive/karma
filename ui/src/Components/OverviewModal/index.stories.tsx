import { FC } from "react";

import { storiesOf } from "@storybook/react";

import { MockGrid } from "../../__fixtures__/Stories";
import { AlertStore } from "../../Stores/AlertStore";
import { OverviewModalContent } from "./OverviewModalContent";

import "Styles/Percy.scss";

storiesOf("OverviewModal", module).add("OverviewModal", () => {
  const Modal: FC = ({ children }) => (
    <div>
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );

  const alertStore = new AlertStore([]);
  MockGrid(alertStore);

  const emptyAlertStore = new AlertStore([]);

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
