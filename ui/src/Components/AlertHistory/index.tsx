import { FC, useEffect, useState } from "react";

import { useInView } from "react-intersection-observer";

import { FormatBackendURI } from "Stores/AlertStore";
import { APIAlertGroupT, HistoryResponseT } from "Models/APITypes";
import { useFetchAny, UpstreamT } from "Hooks/useFetchAny";
import { TooltipWrapper } from "Components/TooltipWrapper";

const responseStub: HistoryResponseT = {
  error: "",
  samples: Array(24).fill({ timestamp: "", value: 0 }),
};

const promURIRe = new RegExp(/(https?:\/\/.+)\/graph?.+/);

export const AlertHistory: FC<{ group: APIAlertGroupT }> = ({ group }) => {
  const [ref, inView] = useInView({ triggerOnce: true });

  const [sources, setSources] = useState<string[]>([]);
  const [upstreams, setUpstreams] = useState<UpstreamT[]>([]);
  const [labels] = useState({ ...group.labels, ...group.shared.labels });
  const { response, error, inProgress } =
    useFetchAny<HistoryResponseT>(upstreams);
  const [maxValue, setMaxValue] = useState<number>(0);

  useEffect(() => {
    if (response !== null) {
      setMaxValue(Math.max(...response.samples.map((s) => s.value)));
    }
  }, [response]);

  useEffect(() => {
    const sl: { [key: string]: boolean } = {};
    for (const alert of group.alerts) {
      for (const am of alert.alertmanager) {
        const match = am.source.match(promURIRe);
        if (match && match.length > 1) {
          sl[match[1]] = true;
        }
      }
    }
    setSources(Object.keys(sl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!inView) {
      return;
    }
    setUpstreams([
      {
        uri: FormatBackendURI("history.json"),
        options: {
          method: "POST",
          body: JSON.stringify({
            sources: sources,
            labels: labels,
          }),
        },
      },
    ]);
  }, [inView, labels, sources]);

  return (
    <div className="w-100 d-flex">
      <div
        ref={ref}
        className="w-100 d-flex justify-content-between align-self-center"
      >
        {error || (response && response.error !== "") ? (
          <TooltipWrapper
            title={error || response?.error}
            className="alert-history-tooltip"
          >
            <svg className="alert-history">
              <rect rx={2} ry={2} className="error"></rect>
            </svg>
          </TooltipWrapper>
        ) : (
          (response || responseStub).samples.map((sample, i) => (
            <svg key={i} className="alert-history">
              <rect
                rx={2}
                ry={2}
                className={
                  inProgress || response === null
                    ? "fetching"
                    : sample.value > 0
                    ? `firing firing-${Math.round(
                        (sample.value / maxValue) * 5
                      )}`
                    : "inactive"
                }
              ></rect>
            </svg>
          ))
        )}
      </div>
    </div>
  );
};
