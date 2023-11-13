import { FC, useEffect, useState } from "react";

import { useInView } from "react-intersection-observer";

import { FormatBackendURI } from "Stores/AlertStore";
import type {
  APIAlertGroupT,
  APIGridT,
  HistoryResponseT,
} from "Models/APITypes";
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

const GetUTCSeconds = (): number => {
  const now = new Date();
  return (now.getTime() + now.getTimezoneOffset()) / 1000;
};

export const AlertHistory: FC<{ group: APIAlertGroupT; grid: APIGridT }> = ({
  group,
  grid,
}) => {
  const [ref, inView] = useInView({ triggerOnce: true });

  const [lastUpdate, setLastUpdate] = useState<number>(GetUTCSeconds());
  const [upstreams, setUpstreams] = useState<UpstreamT[]>([]);
  const [labels] = useState<{ [key: string]: string }>({
    ...Object.fromEntries(group.labels.map((l) => [l.name, l.value])),
    ...Object.fromEntries(group.shared.labels.map((l) => [l.name, l.value])),
    ...(grid.labelName !== "" && grid.labelName[0] !== "@"
      ? { [grid.labelName]: grid.labelValue }
      : {}),
  });
  const [sources] = useState(group.shared.sources);
  const { response, error } = useFetchAny<HistoryResponseT>(upstreams);
  const [cachedResponse, setCachedResponse] = useState<HistoryResponseT | null>(
    null,
  );
  const [minMaxValue, setMinMaxValue] = useState<minMaxT>({
    minValue: 0,
    maxValue: 0,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const utcSeconds = GetUTCSeconds();
      if (inView && utcSeconds - lastUpdate >= 300) {
        setLastUpdate(utcSeconds);
      }
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [inView, lastUpdate]);

  useEffect(() => {
    if (response !== null) {
      setCachedResponse(response);
      const max = Math.max(...response.samples.map((s) => s.value));
      const min = Math.min(
        ...response.samples.filter((s) => s.value > 0).map((s) => s.value),
      );
      setMinMaxValue({ minValue: min === Infinity ? 0 : min, maxValue: max });
    }
  }, [response]);

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
  }, [inView, lastUpdate, labels, sources]);

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
                                (sample.value / minMaxValue.maxValue) * 5,
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
