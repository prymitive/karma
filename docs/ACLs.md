# Silence Access Control Lists

## Intro

Karma provides ability to setup ACLs for silences created by users. This can be
used to limit what kind of silences each user is allowed to create, which can
help to avoid, for example, `Team A` accidentally silencing alerts for `Team B`,
or blocking engineering team from creating any silence at all, leaving that
ability only to the sys admin / SRE team.

Example Alertmanager silence:

```YAML
{
  "matchers": [
    {
      "name": "alertname",
      "value": "Test Alert",
      "isRegex": false,
      "isEqual": true
    },
    {
      "name": "cluster",
      "value": "prod",
      "isRegex": false,
      "isEqual": true
    },
    {
      "name": "instance",
      "value": "server1",
      "isRegex": false,
      "isEqual": true
    }
  ],
  "startsAt": "2020-03-09T20:11:00.000Z",
  "endsAt": "2020-03-09T21:11:00.000Z",
  "createdBy": "me@example.com",
  "comment": "Silence Test Alert on server1"
}
```

It would be applied to all alerts with name `Test Alert` and where label
`cluster` is equal to `prod`.
An ACL rule could be used to restrict silence creation based on matched labels,
so for example only selected users would be allowed to silence this specific
alert.

## Requirements

For ACLs to work a few configuring options are required:

- `authorization:acl:silences` is set with acl config file path, there's no
  support for configuring ACLs via environment variables
- `proxy` must be enabled in karma configuration for each Alertmanager server
  where ACLs will be applied. `proxy: true` tells karma UI to proxy all silence
  operation requests (creating, editing & deleting silences) via karma backend.
  Since ACLs are applied in the proxy code it needs to be enabled to take
  effect. It is recommended to block ability for users to connect directly to
  Alertmanager servers to avoid bypassing ACL rules (alertmanager accepts all
  silences).

Optional configuration:

- `authentication` if configured user based matching of ACLs can be used,
  Header authentication with a frontend authentication proxy that passes
  usernames via header is recommended. This can be done with nginx configured
  as an authentication reverse proxy or proxy services like Cloudflare Access.
- `authorization:groups` must be configured if group polices will be used.
  This configuration maps users into groups, allowing to use those groups in
  ACL rules.

## Regex silences

Alertmanager silences allow to use regex rules which can make it tricky to apply
ACLs to those silences.

Silence example using regex:

```YAML
{
  "matchers": [
    {
      "name": "alertname",
      "value": "Test Alert",
      "isRegex": false,
      "isEqual": true
    },
    {
      "name": "cluster",
      "value": "staging|prod",
      "isRegex": true,
      "isEqual": true
    }
  ],
  "startsAt": "2020-03-09T20:11:00.000Z",
  "endsAt": "2020-03-09T21:11:00.000Z",
  "createdBy": "me@example.com",
  "comment": "Silence Test Alert in staging & prod cluster"
}
```

The difference compared to the previous example is that the `cluster` label
is now matched using `staging|prod` regex, so any alert with `cluster` label
equal to `staging` or `prod` will be matched.
This is a simple example, regexes allow to create very complex matching
rules.

The effect on ACL rules can be illustrated with this example: let's say we have
a group that should never be allowed to create any silence for `prod` cluster,
so a silence like the one below should be blocked:

```YAML
{
  "matchers": [
    {
      "name": "alertname",
      "value": "Test Alert",
      "isRegex": false,
      "isEqual": true
    },
    {
      "name": "cluster",
      "value": "prod",
      "isRegex": false,
      "isEqual": true
    }
  ],
  "startsAt": "2020-03-09T20:11:00.000Z",
  "endsAt": "2020-03-09T21:11:00.000Z",
  "createdBy": "me@example.com",
  "comment": "Silence Test Alert in prod cluster"
}
```

But if we would create an ACL rule that simply blocks silences with matcher:

```YAML
{
  "name": "cluster",
  "value": "prod",
  "isRegex": false,
  "isEqual": true
}
```

then any user could bypass that with a regex matcher like:

```YAML
{
  "name": "cluster",
  "value": "pro[d]",
  "isRegex": true,
  "isEqual": true
}
```

Because of that it is _highly recommended_ to block regex silences, which can
be done with an ACL rule. Since rules are evaluated in the order they are
listed in the config file it is best to set this as the very first rule.
See examples below to learn how to block regex silences.

## Configuration syntax

- `rules` - list of silence ACL rules, rules are evaluated in the order they
  appear in this list

Rule syntax:

```YAML
action: string
reason: string
scope:
  groups: list of strings
  alertmanagers: list of strings
  filters: list of filters
matchers:
  required: list of silence matchers
```

- `action` - this is the name of the action to take if given ACL matches all
  the conditions.
  Valid actions are:
  - `allow` - skip all other ACLs and allow silence to be created
  - `block` - skip all other ACLs and block silences from being created
  - `requireMatcher` - block silence if it doesn't have all of matchers
    specified in `matchers:required`
- `reason` - message that will be returned to the user if this ACL blocks any
  silence
- `scope` - this section contains all conditions required to apply given ACL
  rule to specific silence, if it's skipped then ACL rule will be applied to
  all users and every silence
- `scope:groups` - list of group names from `authorization:groups`, if no group
  is specified here then this ACL will be applied to all users
- `scope:alertmanagers` - list of alertmanager names as specified in
  `alertmanager:servers`, if no name is specified here then this ACL will be
  applied to silences for all alertmanager servers
- `scope:filters` - list of matcher filters evaluated when checking if this ACL
  should be applied to given silence. Those filters can be used to enforce
  ACL rules only to some silences and are compared against silence matchers.
  All filters must be matching for given silence for ACL rule to be applied.
  Syntax:

  ```YAML
  name: string
  name_re: regex
  value: string
  value_re: regex
  isRegex: bool
  isEqual: bool
  ```

  Every rule must have `name` or `name_re` AND `value` or `value_re`.

  Filter works by comparing:

  - `name` and `name_re` with silence matcher `name`.
  - `value` and `value_re` with silence matcher `value`.
  - `isRegex` on the filter with `isRegex` on silence matcher, if `isRegex` is
    not set on a filter then that filter will match silences with both `true`
    and `false` value on silence `isRegex`.
  - `isEqual` on the filter with `isEqual` on silence matcher, if `isEqual` is
    not set on a filter then that filter will match silences with both `true`
    and `false` value on a silence `isEqual`.

  See examples below.
  All regexes will be automatically anchored.

- `matchers:required` - list of additional matchers that must be part of the
  silence if it matches groups, alertmanagers and filters. This is only used
  if `action` is set to `requireMatcher`.
  All regexes will be automatically anchored.
  Syntax for each `requireMatcher` entry:

  ```YAML
  name: string
  name_re: regex
  value: string
  value_re: regex
  isRegex: bool
  isEqual: bool
  ```

  Fields:

  - `name` - name to match, silence will be required to have a matcher with this
    exact name.
  - `name_re` - name regex to match against, silence will be required to have a
    matcher with `name` field that matches this regex.
  - `value` - value to match, silence will be required to have a matcher with
    this exact value.
  - `value_re` - value regex to match against, silence will be required to have
    a matcher with `value` field that matches this regex.
  - `isRegex` - value of silence matcher `isRegex`, if not set on a required
    matcher then any value of `isRegex` on a silence will be allowed.
  - `isEqual` - value of silence matcher `isEqual`, if not set on a required
    matcher then any value of `isEqual` on a silence will be allowed.

  A single entry cannot have both `name` & `name_re` or `value` & `value_re` set
  at the same time.

## Examples

### Block all silences

This rule will match all silence and block it.

```YAML
rules:
  - action: block
    reason: silences are blocked
    scope:
      filters:
        - name_re: .+
          value_re: .+
```

### Block silences using regex matchers

This rule will match all silence with any matcher using regexes
(`isRegex: true` on the matcher) and block it.

```YAML
rules:
  - action: block
    reason: all regex silences are blocked, use only concrete label names and values
    scope:
      filters:
        - name_re: .+
          value_re: .+
          isRegex: true
```

### Block negative matchers on silences

This rule will match all silence with `isEqual: false` and block it.

```YAML
rules:
  - action: block
    reason: silences are blocked
    scope:
      filters:
        - name_re: .+
          value_re: .+
          isEqual: false
```

### Allow admin group to create any silence

```YAML
rules:
  - action: allow
    reason: admins are allowed
    scope:
      groups:
        - admins
```

### Allow only admins group to create silences with cluster=prod

First allow all members of the `admins` group to create any silence, then block
silences with `cluster=prod`. Since ACL rules are evaluated in the order
specified and first `allow` or `block` rule stops other rule processing this
will allow `admins` to create `cluster=prod` silences while everyone else is
blocked from it. Disabling regex rules as first steps prevents users from
bypassing those ACLs with regex silences.

```YAML
rules:
  - action: block
    reason: all regex silences are blocked, use only concrete label names and values
    scope:
      filters:
        - name_re: .+
          value_re: .+
          isRegex: true
  - action: allow
    reason: admins are allowed
    scope:
      groups:
        - admins
  - action: block
    reason: only admins can create silences with cluster=prod
    scope:
      filters:
        - name: cluster
          value: prod
          isEqual: true
```

### Require postgresAdmins group to always specify db=postgres in silences

Block `postgresAdmins` members from creating silences unless they add
`db=postgres` to the list of matchers.

```YAML
rules:
  - action: requireMatcher
    reason: postgres admins must add db=postgres to all silences
    scope:
      groups:
        - postgresAdmins
    matchers:
      required:
        - name: db
          value: postgres
          isEqual: true
```

### Require devTeam group to specify instance=server1-3

Block devTeam members from creating silences unless they target one of the
servers they own.

```YAML
rules:
  - action: requireMatcher
    reason: devTeam can only silence owned servers
    scope:
      groups:
        - devTeam
    matchers:
      required:
        - name: instance
          value_re: server[1-3]
          isEqual: true
```

### Require everyone to always specify `team` matcher in silences

Block anyone from creating silences unless they add `team` matcher with some
value.

```YAML
rules:
  - action: requireMatcher
    reason: team label is required for all silences
    matchers:
      required:
        - name: team
          value_re: .+
```
