import { HistoryResponseT } from "Models/APITypes";

export const EmptyHistoryResponse: HistoryResponseT = {
  error: "",
  samples: Array(24).fill({ timestamp: "", value: 0 }),
};

export const FailedHistoryResponse: HistoryResponseT = {
  error: "mock error",
  samples: Array(24).fill({ timestamp: "", value: 0 }),
};

export const RainbowHistoryResponse: HistoryResponseT = {
  error: "",
  samples: Array(24)
    .fill(0)
    .map((_, i) => ({ timestamp: "", value: i % 6 })),
};
