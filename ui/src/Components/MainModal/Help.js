import React from "react";
import PropTypes from "prop-types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons/faInfoCircle";

import { Accordion } from "Components/Accordion";

const FilterOperatorHelp = ({ operator, description, children }) => (
  <React.Fragment>
    <dt>
      <kbd>{operator}</kbd> {description}
    </dt>
    <dd className="mb-3">
      <div>
        Example:{" "}
        <code>
          key
          {operator}
          value
        </code>
      </div>
      <div>{children}</div>
    </dd>
  </React.Fragment>
);
FilterOperatorHelp.propTypes = {
  operator: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

const QueryHelp = ({ title, operators, warning, children }) => (
  <React.Fragment>
    <dt>{title}</dt>
    <dd className="mb-5">
      <div>
        Supported operators:{" "}
        {operators.map((op) => (
          <kbd key={op} className="mr-1">
            {op}
          </kbd>
        ))}
      </div>
      {warning ? (
        <div className="my-1 alert alert-secondary">
          <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
          {warning}
        </div>
      ) : null}
      <div>Examples:</div>
      <ul>{children}</ul>
    </dd>
  </React.Fragment>
);
QueryHelp.propTypes = {
  title: PropTypes.string.isRequired,
  operators: PropTypes.arrayOf(PropTypes.string).isRequired,
  warning: PropTypes.node,
};

const FilterExample = ({ example, children }) => (
  <li>
    <div>
      <span className="badge badge-info">{example}</span>
    </div>
    <div>{children}</div>
  </li>
);
FilterExample.propTypes = {
  example: PropTypes.string.isRequired,
  children: PropTypes.node,
};

const Help = ({ defaultIsOpen }) => (
  <div className="accordion">
    <Accordion
      text="Fiter operators"
      content={
        <dl>
          <FilterOperatorHelp operator="=" description="Exact match">
            True if compared alert attribute value is equal to{" "}
            <code>value</code>.
          </FilterOperatorHelp>
          <FilterOperatorHelp operator="!=" description="Negative match">
            True if compared alert attribute is missing or have a value that is
            not equal to <code>value</code>.
          </FilterOperatorHelp>
          <FilterOperatorHelp
            operator="=~"
            description="Regular expression match"
          >
            True if compared alert attribute value matches <code>value</code>{" "}
            regex.
          </FilterOperatorHelp>
          <FilterOperatorHelp
            operator="!~"
            description="Negative regular expression match"
          >
            False if compared alert attribute value matches <code>value</code>{" "}
            regex.
          </FilterOperatorHelp>
          <FilterOperatorHelp operator="&gt;" description="Greater than match">
            True if compared alert attribute value is greater than{" "}
            <code>value</code>.
          </FilterOperatorHelp>
          <FilterOperatorHelp operator="&lt;" description="Less than match">
            True if compared alert attribue value is less than{" "}
            <code>value</code>.
          </FilterOperatorHelp>
        </dl>
      }
      defaultIsOpen={true}
    />
    <Accordion
      text="Filtering using alert labels"
      content={
        <dl>
          <QueryHelp
            title="Match alerts based on any label"
            operators={["=", "!=", "=~", "!~", ">", "<"]}
          >
            <FilterExample example="alertname=UnableToPing">
              Match alerts with label <code>alertname</code> equal to{" "}
              <code>UnableToPing</code>.
            </FilterExample>
            <FilterExample example="hostname=localhost">
              Match alerts with label <code>hostname</code> equal to{" "}
              <code>localhost</code>.
            </FilterExample>
            <FilterExample example="service!=apache3">
              Match alerts with label <code>service</code> missing or not equal
              to <code>apache3</code>.
            </FilterExample>
            <FilterExample example="service=~apache">
              Match alerts with label <code>service</code> matching regular
              expression <code>/.*apache.*/</code>.
            </FilterExample>
            <FilterExample example="service=~apache[1-3]">
              Match alerts with label <code>service</code> matching regular
              expression <code>/.*apache[1-3].*/</code>.
            </FilterExample>
            <FilterExample example="priority>4">
              Match alerts with label <code>priority</code> value{" "}
              <code>&gt;</code> than <code>4</code>. Value will be casted to
              integer if possible, string comparision will be used as fallback.
            </FilterExample>
          </QueryHelp>
        </dl>
      }
      defaultIsOpen={defaultIsOpen}
    />
    <Accordion
      text="Filtering alerts using special filters"
      content={
        <dl>
          <QueryHelp
            title="Match alerts based on the Alertmanager instance name they were
          collected from"
            operators={["=", "!=", "=~", "!~"]}
          >
            <FilterExample example="@alertmanager=prod">
              Match alerts collected from Alertmanager instance named{" "}
              <code>prod</code>.
            </FilterExample>
            <FilterExample example="@alertmanager!=dev">
              Match alerts collected from Alertmanager instances except for the
              one named <code>dev</code>.
            </FilterExample>
            <FilterExample example="@alertmanager=~prod">
              Match alerts collected from Alertmanager instances with names
              matching regular expression <code>/.*prod.*/</code>.
            </FilterExample>
          </QueryHelp>

          <QueryHelp
            title="Match alerts based on the receiver name"
            operators={["=", "!=", "=~", "!~"]}
          >
            <FilterExample example="@receiver=default">
              Match alerts sent to the default receiver.
            </FilterExample>
            <FilterExample example="@receiver!=hipchat">
              Match alerts not sent to the hipchat receiver.
            </FilterExample>
            <FilterExample example="@receiver=~email">
              Match alerts sent to any receiver with name matching regular
              expression <code>/.*email.*/</code>.
            </FilterExample>
          </QueryHelp>

          <QueryHelp
            title="Match alerts based on the state"
            operators={["=", "!="]}
          >
            <FilterExample example="@state=active">
              Match only active alerts.
            </FilterExample>
            <FilterExample example="@state!=active">
              Match alerts that are not active, only suppressed and unprocessed
              will be matched.
            </FilterExample>
            <FilterExample example="@state=suppressed">
              Match only suppressed alerts.
            </FilterExample>
            <FilterExample example="@state=unprocessed">
              Match only unprocessed alerts.
            </FilterExample>
          </QueryHelp>

          <QueryHelp
            title="Match suppressed alerts based on the silence ID"
            operators={["=", "!="]}
          >
            <FilterExample example="@silence_id=abc123456789">
              Match alerts suppressed by silence <code>abc123456789</code>.
            </FilterExample>
            <FilterExample example="@silence_id!=abc123456789">
              Match alerts suppressed by any silence except{" "}
              <code>abc123456789</code>.
            </FilterExample>
          </QueryHelp>

          <QueryHelp
            title="Match alerts based on the author of silence"
            operators={["=", "!=", "=~", "!~"]}
          >
            <FilterExample example="@silence_author=me@example.com">
              Match alerts silenced by <code>me@example.com</code>.
            </FilterExample>
            <FilterExample example="@silence_author!=me@example.com">
              Match alerts silenced by everyone except{" "}
              <code>foo@example.com</code>.
            </FilterExample>
            <FilterExample example="@silence_author=~@example.com">
              Match alerts silenced by author matching regular expression{" "}
              <code>/.*@example.com.*/</code>.
            </FilterExample>
          </QueryHelp>

          <QueryHelp
            title="Match alerts based on the ticket IDs detected in the silence comment"
            operators={["=", "!=", "=~", "!~"]}
            warning="This is supported only if ticket regexp rules are enabled and able to
            match ticket IDs in the silence comment."
          >
            <FilterExample example="@silence_ticket=PROJECT-123">
              Match silenced alerts where detected ticket ID is equal to{" "}
              <code>PROJECT-123</code>.
            </FilterExample>
            <FilterExample example="@silence_ticket!=PROJECT-123">
              Match silenced alerts where detected ticket ID is different than{" "}
              <code>PROJECT-123</code>.
            </FilterExample>
            <FilterExample example="@silence_ticket=~PROJECT">
              Match silenced alerts where detected ticket ID matches regular
              expression <code>/.*PROJECT.*/</code>.
            </FilterExample>
          </QueryHelp>

          <QueryHelp
            title="Limit number of displayed alerts"
            operators={["="]}
            warning="Value must be a number &gt;= 1."
          >
            <FilterExample example="@limit=10">
              Limit number of displayed alerts to 10.
            </FilterExample>
          </QueryHelp>

          <QueryHelp
            title="Match alerts based on creation timestamp"
            operators={[">", "<"]}
          >
            <FilterExample example="@age&gt;15m">
              Match alerts older than 15 minutes.
            </FilterExample>
            <FilterExample example="@age&gt;1h">
              Match alerts older than 1 hour.
            </FilterExample>
            <FilterExample example="@age&lt;10h30m">
              Match alerts more recent than 10 hours and 30 minutes.
            </FilterExample>
          </QueryHelp>
        </dl>
      }
      defaultIsOpen={defaultIsOpen}
    />
  </div>
);
Help.propTypes = {
  defaultIsOpen: PropTypes.bool.isRequired,
};

export { Help };
