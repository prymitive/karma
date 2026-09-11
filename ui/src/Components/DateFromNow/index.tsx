import { FC } from "react";

import { parseISO } from "date-fns/parseISO";
import { differenceInSeconds } from "date-fns/differenceInSeconds";
import { formatDistanceStrict } from "date-fns/formatDistanceStrict";

import { useNow } from "Hooks/useNow";

const formatLabel = (timestamp: string, now: number) => {
  const ts = parseISO(timestamp);
  const diff = differenceInSeconds(now, ts);
  if (diff > 0 && diff < 45) return "a few seconds ago";
  if (diff < 0 && diff >= -45) return "in a few seconds";
  if (diff === 0) return "just now";
  return formatDistanceStrict(ts, now, {
    addSuffix: true,
  });
};

export const DateFromNow: FC<{ timestamp: string }> = ({ timestamp }) => {
  const now = useNow();
  return <>{formatLabel(timestamp, now)}</>;
};
