import React from "react";
import { storiesOf } from "@storybook/react";

import { AlertStore, NewUnappliedFilter } from "Stores/AlertStore";
import { FilterInputLabel } from ".";

import "App.scss";

storiesOf("FilterInputLabel", module)
  .addDecorator(storyFn => <div className="p-2">{storyFn()}</div>)
  .add("applied => false", () => {
    const alertStore = new AlertStore([]);
    const filter = NewUnappliedFilter(`@state=active`);
    alertStore.filters.values = [filter];
    return <FilterInputLabel alertStore={alertStore} filter={filter} />;
  })
  .add("isValid => false", () => {
    const alertStore = new AlertStore([]);
    const filter = NewUnappliedFilter(`@state=active`);
    filter.isValid = false;
    alertStore.filters.values = [filter];
    return <FilterInputLabel alertStore={alertStore} filter={filter} />;
  })
  .add("Single applied => true", () => {
    const alertStore = new AlertStore([]);
    alertStore.info.totalAlerts = 99;
    const filter = NewUnappliedFilter(`@state=active`);
    filter.applied = true;
    filter.hits = 99;
    alertStore.filters.values = [filter];
    return <FilterInputLabel alertStore={alertStore} filter={filter} />;
  })
  .add("Multiple applied => true", () => {
    const alertStore = new AlertStore([]);
    const filter = NewUnappliedFilter(`@state=active`);
    filter.applied = true;
    filter.hits = 99;
    alertStore.filters.values = [filter];
    return <FilterInputLabel alertStore={alertStore} filter={filter} />;
  });
