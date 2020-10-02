import { useState, useEffect, FC } from "react";

import { autorun } from "mobx";

import Favico from "favico.js";

import { AlertStore } from "Stores/AlertStore";

const FaviconBadge: FC<{
  alertStore: AlertStore;
}> = ({ alertStore }) => {
  const [favico] = useState(
    new Favico({
      animation: "none",
      position: "down",
      bgColor: "#e74c3c",
      textColor: "#fff",
    })
  );

  useEffect(
    () =>
      autorun(() => {
        favico.badge(
          alertStore.status.error === null ? alertStore.info.totalAlerts : "?"
        );
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return null;
};

export default FaviconBadge;
