import { FC } from "react";

import { observer } from "mobx-react-lite";

import JSONPretty from "react-json-pretty";
import * as theme from "react-json-pretty/dist/monikai";

import { SilenceFormStore } from "Stores/SilenceFormStore";

const PayloadPreview: FC<{
  silenceFormStore: SilenceFormStore;
}> = ({ silenceFormStore }) => {
  return (
    <JSONPretty
      json={silenceFormStore.data.toAlertmanagerPayload}
      theme={theme}
      themeClassName="rounded p-1"
    />
  );
};

export default observer(PayloadPreview);
