import type { FC } from "react";

import { CenteredMessage } from "Components/CenteredMessage";

const NoUpstream: FC = () => (
  <CenteredMessage>No alertmanager server configured</CenteredMessage>
);

export { NoUpstream };
