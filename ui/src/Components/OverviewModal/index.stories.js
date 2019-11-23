import React from "react";

import { storiesOf } from "@storybook/react";

import { MockGrid } from "__mocks__/Stories.js";
import { AlertStore } from "Stores/AlertStore";
import { OverviewModalContent } from "./OverviewModalContent";

import "Styles/Percy.scss";

storiesOf("OverviewModal", module)
  .addDecorator(storyFn => (
    <div>
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">{storyFn()}</div>
      </div>
    </div>
  ))
  .add("OverviewModal", () => {
    const alertStore = new AlertStore([]);

    MockGrid(alertStore);

    return <OverviewModalContent alertStore={alertStore} onHide={() => {}} />;
  });
