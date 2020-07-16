import React, { FC } from "react";

import { useObserver } from "mobx-react-lite";

import JSONPretty from "react-json-pretty";
import * as theme from "react-json-pretty/dist/monikai";

import { SilenceFormStore } from "Stores/SilenceFormStore";

const PayloadPreview: FC<{
  silenceFormStore: SilenceFormStore;
}> = ({ silenceFormStore }) => {
  return useObserver(() => (
    <JSONPretty
      json={silenceFormStore.data.toAlertmanagerPayload}
      theme={theme}
      themeClassName="rounded p-1"
    />
  ));
};

export { PayloadPreview };
