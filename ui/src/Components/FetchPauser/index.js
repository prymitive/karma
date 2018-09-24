import { Component } from "react";
import PropTypes from "prop-types";

import { inject } from "mobx-react";

import { AlertStore } from "Stores/AlertStore";

const FetchPauser = inject("alertStore")(
  class FetchPauser extends Component {
    static propTypes = {
      children: PropTypes.any,
      alertStore: PropTypes.instanceOf(AlertStore).isRequired
    };

    componentDidMount() {
      const { alertStore } = this.props;
      alertStore.status.pause();
    }

    componentWillUnmount() {
      const { alertStore } = this.props;
      alertStore.status.resume();
    }

    render() {
      return this.props.children;
    }
  }
);

export { FetchPauser };
