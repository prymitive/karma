import React, { FunctionComponent } from "react";

const UpstreamError: FunctionComponent<{
  name: string;
  message: string;
}> = ({ name, message }) => {
  return (
    <div className="alert alert-danger text-center m-1" role="alert">
      <h4 className="alert-heading mb-0 text-wrap text-break">
        Alertmanager <span className="font-weight-bold">{name}</span> raised an
        error: {message}
      </h4>
    </div>
  );
};

export { UpstreamError };
