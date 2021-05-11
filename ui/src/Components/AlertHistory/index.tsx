import { FC, useEffect, useState } from "react";

import { useInView } from "react-intersection-observer";

import { FormatBackendURI } from "Stores/AlertStore";
import { APIAlertGroupT, HistoryResponseT } from "Models/APITypes";
import { useFetchAny, UpstreamT } from "Hooks/useFetchAny";
import { TooltipWrapper } from "Components/TooltipWrapper";

interface minMaxT {
  minValue: number;
  maxValue: number;
}

const responseStub: HistoryResponseT = {
  error: "",
  samples: Array(24).fill({ timestamp: "", value: 0 }),
};

const promURIRe = new RegExp(/^(https?:\/\/.+)\//);

export const AlertHistory: FC<{ group: APIAlertGroupT }> = ({ group }) => {
  const [ref, inView] = useInView({ triggerOnce: true });

  const [epoch, setEpoch] = useState<number>(0);
  const [sources, setSources] = useState<string[]>([]);
  const [upstreams, setUpstreams] = useState<UpstreamT[]>([]);
  const [labels] = useState({ ...group.labels, ...group.shared.labels });
  const { response, error } = useFetchAny<HistoryResponseT>(upstreams);
  const [cachedResponse, setCachedResponse] =
    useState<HistoryResponseT | null>(null);
  const [minMaxValue, setMinMaxValue] = useState<minMaxT>({
    minValue: 0,
    maxValue: 0,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setEpoch((val) => val + 1);
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [inView]);

  useEffect(() => {
    if (response !== null) {
      setCachedResponse(response);
      const max = Math.max(...response.samples.map((s) => s.value));
      const min = Math.min(
        ...response.samples.filter((s) => s.value > 0).map((s) => s.value)
      );
      setMinMaxValue({ minValue: min === Infinity ? 0 : min, maxValue: max });
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
  }, [inView, labels, sources, epoch]);

  return (
    <div className="w-100 d-flex">
      <div
        ref={ref}
        className="w-100 d-flex justify-content-between align-self-center"
      >
        {error || (cachedResponse && cachedResponse.error !== "") ? (
          <TooltipWrapper
            title={error || cachedResponse?.error}
            className="alert-history-tooltip"
          >
            <svg className="alert-history">
              <rect rx={2} ry={2} className="error"></rect>
            </svg>
          </TooltipWrapper>
        ) : (
          (cachedResponse || responseStub).samples.map((sample, i) => (
            <svg key={i} className="alert-history">
              <rect
                rx={2}
                ry={2}
                className={
                  cachedResponse === null
                    ? "fetching"
                    : sample.value > 0
                    ? `firing firing-${
                        minMaxValue.minValue === minMaxValue.maxValue
                          ? Math.min(minMaxValue.maxValue, 5)
                          : Math.round(
                              (sample.value / minMaxValue.maxValue) * 5
                            )
                      }`
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
