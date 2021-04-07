import { FC, useState, useEffect } from "react";

import parseISO from "date-fns/parseISO";
import differenceInSeconds from "date-fns/differenceInSeconds";
import formatDistanceToNowStrict from "date-fns/formatDistanceToNowStrict";

const formatLabel = (timestamp: string) => {
  const ts = parseISO(timestamp);
  const diff = differenceInSeconds(new Date(), ts);
  if (diff > 0 && diff < 45) return "a few seconds ago";
  if (diff < 0 && diff >= -45) return "in a few seconds";
  if (diff === 0) return "just now";
  return formatDistanceToNowStrict(ts, {
    addSuffix: true,
  });
};

export const DateFromNow: FC<{ timestamp: string }> = ({ timestamp }) => {
  const [label, setLabel] = useState<string>(formatLabel(timestamp));

  useEffect(() => {
    const timer = setInterval(
      () => setLabel(formatLabel(timestamp)),
      30 * 1000
    );
    return () => clearInterval(timer);
  }, [timestamp]);

  return <>{label}</>;
};
