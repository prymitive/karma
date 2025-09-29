import { FC, ReactNode } from "react";

import { DateFromNow } from "Components/DateFromNow";

export interface NotificationContentProps {
  title: ReactNode;
  message: ReactNode;
  timestamp: Date;
  occurrenceCount?: number;
}

const NotificationContent: FC<NotificationContentProps> = ({
  title,
  message,
  timestamp,
  occurrenceCount = 1,
}) => {
  return (
    <div className="flex-grow-1">
      <div className="d-flex align-items-center">
        <h6
          className="alert-heading mb-1 flex-grow-1"
          dangerouslySetInnerHTML={{ __html: String(title) }}
        ></h6>
        {occurrenceCount > 1 && (
          <span className="badge bg-secondary ms-2 text-white">
            {occurrenceCount}x
          </span>
        )}
      </div>
      <small
        className="mb-1 d-block"
        dangerouslySetInnerHTML={{ __html: String(message) }}
      ></small>
      <div className="text-white-50" style={{ fontSize: "0.75rem" }}>
        <DateFromNow timestamp={timestamp.toISOString()} />
      </div>
    </div>
  );
};

export { NotificationContent };
