import React, { FC, ChangeEvent } from "react";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons/faUser";

import { AlertStore } from "Stores/AlertStore";

const IconInput: FC<{
  type: string;
  autoComplete: string;
  icon: IconDefinition;
  placeholder: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
}> = ({ type, autoComplete, icon, placeholder, value, onChange, ...extra }) => (
  <div className="input-group mb-3">
    <div className="input-group-prepend">
      <span className="input-group-text">
        <FontAwesomeIcon icon={icon} />
      </span>
    </div>
    <input
      type={type}
      className="form-control"
      placeholder={placeholder}
      value={value}
      required
      autoComplete={autoComplete}
      onChange={onChange}
      {...extra}
    />
  </div>
);

const AuthenticatedAuthorInput: FC<{
  alertStore: AlertStore;
}> = ({ alertStore }) => (
  <IconInput
    type="text"
    autoComplete="email"
    placeholder="Author"
    icon={faUser}
    value={alertStore.info.authentication.username}
    readOnly={true}
  />
);

export { IconInput, AuthenticatedAuthorInput };
