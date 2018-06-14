import React, { Component } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy } from "@fortawesome/free-solid-svg-icons/faTrophy";

class BlankPage extends Component {
  render() {
    return (
      <div className="jumbotron text-center bg-primary my-4">
        <h1 className="display-1 my-5">
          <FontAwesomeIcon className="text-success" icon={faTrophy} />
        </h1>
        <p className="lead text-muted">Nothing to show</p>
      </div>
    );
  }
}

export { BlankPage };
