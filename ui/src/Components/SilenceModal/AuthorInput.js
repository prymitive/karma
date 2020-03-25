import React from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons/faUser";

import { AlertStore } from "Stores/AlertStore";

const IconInput = ({
  type,
  autoComplete,
  icon,
  placeholder,
  value,
  onChange,
  ...extra
}) => (
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
IconInput.propTypes = {
  type: PropTypes.string.isRequired,
  autoComplete: PropTypes.string.isRequired,
  icon: FontAwesomeIcon.propTypes.icon.isRequired,
  placeholder: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func,
};

const AuthenticatedAuthorInput = ({ alertStore }) => (
  <IconInput
    type="text"
    autoComplete="email"
    placeholder="Author"
    icon={faUser}
    value={alertStore.info.authentication.username}
    readOnly={true}
  />
);
AuthenticatedAuthorInput.propTypes = {
  alertStore: PropTypes.instanceOf(AlertStore).isRequired,
};

export { IconInput, AuthenticatedAuthorInput };
