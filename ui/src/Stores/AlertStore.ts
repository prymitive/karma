import { makeAutoObservable, observableRef, action, toJS } from "mobx";

import { throttle } from "es-toolkit";

import { FetchGet } from "Common/Fetch";
import type {
  APIAlertmanagerUpstreamT,
  APILabelColorT,
  APIAlertsResponseT,
  APIAlertsResponseColorsT,
  APIGridT,
  ReadOnly,
  APIAlertsResponseSilenceMapT,
  APIAlertsResponseUpstreamsT,
  APIAlertsResponseUpstreamsClusterMapT,
  APISettingsT,
  AlertsRequestT,
} from "Models/APITypes";

function FormatAlertsQ(filters: string[]): string {
  return new URLSearchParams(filters.map((f) => ["q", f])).toString();
}

// generate URL for the UI with a set of filters
function FormatAPIFilterQuery(filters: string[]): string {
  const params = DecodeLocationSearch(window.location.search).params;
  const merged = { ...params, q: filters || [] };
  return new URLSearchParams(merged.q.map((f) => ["q", f])).toString();
}

// format URI for react UI -> Go backend requests
function FormatBackendURI(path: string): string {
  return `./${path}`;
}

// takes the '?foo=bar&foo=baz' part of http://example.com?foo=bar&foo=baz
// and decodes it into a dict with some extra metadata
interface QueryParamsT {
  q: string[];
  m?: string;
}
interface DecodeLocationSearchReturnT {
  params: QueryParamsT;
  defaultsUsed: boolean;
}
function DecodeLocationSearch(
  searchString: string,
): DecodeLocationSearchReturnT {
  let defaultsUsed = true;
  const params: QueryParamsT = { q: [] };

  if (searchString !== "") {
    const usp = new URLSearchParams(searchString.split("?")[1]);
    const mValue = usp.get("m");
    if (mValue !== null) {
      params.m = mValue;
    }
    const qValues = [...usp.getAll("q"), ...usp.getAll("q[]")];
    let parsedQ: string | string[] | undefined;
    if (qValues.length > 0) {
      parsedQ = qValues.length === 1 ? qValues[0] : qValues;
    }

    if (parsedQ !== undefined) {
      defaultsUsed = false;
      if (parsedQ === "") {
        params.q = [];
      } else if (Array.isArray(parsedQ)) {
        // first filter out duplicates
        // then filter out empty strings, so 'q=' doesn't end up [""] but rather []
        params.q = parsedQ
          .filter((v: string, i: number) => parsedQ.indexOf(v) === i)
          .filter((v: string) => v !== "");
      } else {
        params.q = [parsedQ];
      }
    }
  }

  return { params: params, defaultsUsed: defaultsUsed };
}

function UpdateLocationSearch(newParams: QueryParamsT): void {
  const baseURLWithoutSearch = window.location.href.split("?")[0];
  const newSearch = FormatAPIFilterQuery(newParams.q);
  window.history.pushState(
    null,
    "",
    `${baseURLWithoutSearch}?${newSearch || "q="}`,
  );
}

const AlertStoreStatuses = Object.freeze({
  Idle: Symbol("idle"),
  Fetching: Symbol("fetching"),
  Processing: Symbol("processing"),
  Failure: Symbol("failure"),
});

export interface FilterT {
  applied: boolean;
  isValid: boolean;
  raw: string;
  hits: number;
  name: string;
  matcher: string;
  value: string;
}

function NewUnappliedFilter(raw: string): FilterT {
  return {
    applied: false,
    isValid: true,
    raw: raw,
    hits: 0,
    name: "",
    matcher: "",
    value: "",
  };
}

class AlertStoreFilters {
  values: FilterT[] = [];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true, name: "API Filters" });
  }

  addFilter(raw: string) {
    if (this.values.filter((f) => f.raw === raw).length === 0) {
      this.values.push(NewUnappliedFilter(raw));
      UpdateLocationSearch({ q: this.values.map((f) => f.raw) });
    }
  }

  removeFilter(raw: string) {
    if (this.values.filter((f) => f.raw === raw).length > 0) {
      this.values = this.values.filter((f) => f.raw !== raw);
      UpdateLocationSearch({ q: this.values.map((f) => f.raw) });
    }
  }

  replaceFilter(oldRaw: string, newRaw: string) {
    const index = this.values.findIndex((e) => e.raw === oldRaw);
    if (index >= 0) {
      // first check if we would create a duplicated filter
      if (this.values.findIndex((e) => e.raw === newRaw) >= 0) {
        // we already have newRaw, simply drop oldRaw
        this.removeFilter(oldRaw);
      } else {
        // no dups, continue with a swap
        this.values[index] = NewUnappliedFilter(newRaw);
        UpdateLocationSearch({ q: this.values.map((f) => f.raw) });
      }
    } else {
      this.addFilter(newRaw);
    }
  }

  setFilters(raws: string[]) {
    this.values = raws.map((raw) => NewUnappliedFilter(raw));
    UpdateLocationSearch({ q: this.values.map((f) => f.raw) });
  }

  setFilterValues(v: FilterT[]) {
    this.values = v;
  }

  setWithoutLocation(raws: string[]) {
    const filtersByRaw: { [key: string]: FilterT } = this.values.reduce(
      function (map: { [key: string]: FilterT }, obj) {
        map[toJS(obj.raw)] = toJS(obj);
        return map;
      },
      {},
    );
    this.values = raws.map((raw) =>
      filtersByRaw[raw] ? filtersByRaw[raw] : NewUnappliedFilter(raw),
    );
  }

  applyAllFilters() {
    for (let i = 0; i < this.values.length; i++) {
      this.values[i].applied = true;
    }
  }
}

class AlertStoreData {
  colors: ReadOnly<APIAlertsResponseColorsT> = {};
  grids: ReadOnly<APIGridT[]> = [];
  labelNames: ReadOnly<string[]> = [];
  silences: ReadOnly<APIAlertsResponseSilenceMapT> = {};
  upstreams: ReadOnly<APIAlertsResponseUpstreamsT> = {
    counters: { total: 0, healthy: 0, failed: 0 },
    instances: [],
    clusters: {},
  };
  receivers: ReadOnly<string[]> = [];

  constructor() {
    makeAutoObservable(
      this,
      {
        // all of these are replaced wholesale on every API response,
        // so there's no need to deep convert them into observables
        colors: observableRef,
        grids: observableRef,
        labelNames: observableRef,
        silences: observableRef,
        upstreams: observableRef,
        receivers: observableRef,
      },
      { autoBind: true, name: "API Response data" },
    );
  }

  get gridPadding(): number {
    return this.grids.filter((g) => g.labelName !== "").length > 0 ? 5 : 0;
  }

  getAlertmanagerByName(
    name: string,
  ): ReadOnly<APIAlertmanagerUpstreamT> | undefined {
    return this.upstreams.instances.find((am) => am.name === name);
  }

  isReadOnlyAlertmanager(name: string): boolean {
    return this.readOnlyAlertmanagers.map((am) => am.name).includes(name);
  }

  getClusterAlertmanagersWithoutReadOnly(clusterID: string): string[] {
    return this.clustersWithoutReadOnly[clusterID] || [];
  }

  get readOnlyAlertmanagers(): ReadOnly<APIAlertmanagerUpstreamT>[] {
    return this.upstreams.instances.filter((am) => am.readonly === true);
  }

  get readWriteAlertmanagers(): ReadOnly<APIAlertmanagerUpstreamT>[] {
    return this.upstreams.instances
      .filter((am) => am.readonly === false)
      .map((am) =>
        Object.assign({}, am, {
          clusterMembers: am.clusterMembers.filter(
            (m) => this.isReadOnlyAlertmanager(m) === false,
          ),
        }),
      );
  }

  get clustersWithoutReadOnly(): APIAlertsResponseUpstreamsClusterMapT {
    const unhealthy = this.upstreams.instances
      .filter((upstream) => upstream.error !== "")
      .map((upstream) => upstream.name);
    const clusters: APIAlertsResponseUpstreamsClusterMapT = {};
    for (const clusterID of Object.keys(this.upstreams.clusters)) {
      const members = this.upstreams.clusters[clusterID].filter(
        (member) => this.isReadOnlyAlertmanager(member) === false,
      );
      if (members.length > 0) {
        clusters[clusterID] = [
          ...members.filter((member) => !unhealthy.includes(member)),
          ...members.filter((member) => unhealthy.includes(member)),
        ];
      }
    }
    return clusters;
  }

  getColorData(
    name: string,
    value: string,
  ): ReadOnly<APILabelColorT> | undefined {
    if (this.colors[name] !== undefined) {
      return this.colors[name][value];
    }
  }

  setGrids(g: ReadOnly<APIGridT[]>) {
    this.grids = g;
  }

  setUpstreams(u: ReadOnly<APIAlertsResponseUpstreamsT>) {
    this.upstreams = u;
  }

  setClusters(c: ReadOnly<APIAlertsResponseUpstreamsClusterMapT>) {
    this.upstreams = { ...this.upstreams, clusters: c };
  }

  setSilences(s: ReadOnly<APIAlertsResponseSilenceMapT>) {
    this.silences = s;
  }

  setReceivers(r: ReadOnly<string[]>) {
    this.receivers = r;
  }

  setColors(c: ReadOnly<APIAlertsResponseColorsT>) {
    this.colors = c;
  }

  setLabelNames(v: ReadOnly<string[]>) {
    this.labelNames = v;
  }

  get upstreamsWithErrors(): ReadOnly<APIAlertmanagerUpstreamT>[] {
    const unhealthy: ReadOnly<APIAlertmanagerUpstreamT>[] = [];
    for (const clusterID of Object.keys(this.upstreams.clusters)) {
      const members = this.upstreams.instances.filter(
        (upstream) => upstream.cluster === clusterID,
      );
      if (
        members.length > 0 &&
        members.filter((upstream) => upstream.error === "").length === 0
      ) {
        unhealthy.push(...members);
      }
    }
    return unhealthy;
  }
}

class AlertStoreInfo {
  authentication = {
    enabled: false as boolean,
    username: "",
  };
  totalAlerts = 0;
  version = "unknown";
  timestamp = "";
  upgradeReady = false;
  upgradeNeeded = false;
  isRetrying = false;
  reloadNeeded = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true, name: "API response info" });
  }

  setIsRetrying() {
    this.isRetrying = true;
  }

  clearIsRetrying() {
    this.isRetrying = false;
  }

  setUpgradeNeeded(v: boolean) {
    this.upgradeNeeded = v;
  }

  setUpgradeReady(v: boolean) {
    this.upgradeReady = v;
  }

  setReloadNeeded(v: boolean) {
    this.reloadNeeded = v;
  }

  setTotalAlerts(n: number) {
    this.totalAlerts = n;
  }

  setAuthentication(enabled: boolean, username: string) {
    this.authentication.enabled = enabled;
    this.authentication.username = username;
  }

  setVersion(v: string) {
    this.version = v;
  }

  setTimestamp(v: string) {
    this.timestamp = v;
  }
}

class AlertStoreSettings {
  values: ReadOnly<APISettingsT> = {
    annotationsDefaultHidden: false as boolean,
    annotationsHidden: [] as string[],
    annotationsVisible: [] as string[],
    annotationsEnableHTML: false as boolean,
    sorting: {
      grid: {
        order: "startsAt",
        reverse: false as boolean,
        label: "alertname",
      },
      valueMapping: {},
    },
    silenceForm: {
      strip: {
        labels: [] as string[],
      },
      defaultAlertmanagers: [] as string[],
    },
    alertAcknowledgement: {
      enabled: false as boolean,
      durationSeconds: 900,
      author: "karma / author missing",
      comment: "ACK! This alert was acknowledged using karma",
    },
    historyEnabled: true,
    gridGroupLimit: 40,
    labels: {},
  };

  constructor() {
    makeAutoObservable(
      this,
      { values: observableRef },
      { autoBind: true, name: "Global settings" },
    );
  }

  setValues(v: ReadOnly<APISettingsT>) {
    this.values = v;
  }
}

class AlertStoreStatus {
  value: symbol = AlertStoreStatuses.Idle;
  lastUpdateAt: number | Date = 0;
  error: null | string = null;
  stopped = false;
  paused = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true, name: "Store status" });
  }

  setIdle() {
    this.value = AlertStoreStatuses.Idle;
    this.error = null;
    this.lastUpdateAt = new Date();
  }

  setFetching() {
    this.value = AlertStoreStatuses.Fetching;
  }

  setProcessing() {
    this.value = AlertStoreStatuses.Processing;
    this.error = null;
  }

  setFailure(err: string) {
    this.value = AlertStoreStatuses.Failure;
    this.error = err;
    this.lastUpdateAt = new Date();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = this.stopped ? true : false;
  }

  togglePause() {
    this.paused = this.stopped ? true : !this.paused;
  }

  stop() {
    this.paused = true;
    this.stopped = true;
  }

  setError(e: null | string) {
    this.error = e;
  }
}

class AlertStoreUI {
  isIdle = false;
  gridGroupLimits: { [key: string]: { [val: string]: number } } = {};
  groupAlertLimits: { [gid: string]: number } = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setIsIdle(val: boolean) {
    this.isIdle = val;
  }

  setGridGroupLimit(key: string, val: string, limit: number) {
    this.gridGroupLimits = {
      [key]: { ...this.gridGroupLimits[key], [val]: limit },
    };
  }

  setGroupAlertLimit(gid: string, limit: number) {
    this.groupAlertLimits[gid] = limit;
  }

  purgeGroupAlertLimits(knownGids: string[]) {
    const newLimits: { [gid: string]: number } = {};
    Object.entries(this.groupAlertLimits)
      .filter(([gid, _]) => knownGids.includes(gid))
      .forEach(([gid, limit]) => {
        newLimits[gid] = limit;
      });
    this.groupAlertLimits = newLimits;
  }
}

class AlertStore {
  filters = new AlertStoreFilters();
  data = new AlertStoreData();
  info = new AlertStoreInfo();
  settings = new AlertStoreSettings();
  status = new AlertStoreStatus();
  ui = new AlertStoreUI();

  constructor(initialFilters: null | string[]) {
    if (initialFilters !== null) this.filters.setFilters(initialFilters);
  }

  fetch = action(
    async (
      gridLabel: string,
      gridSortReverse: boolean,
      sortOrder: string,
      sortLabel: string,
      sortReverse: boolean,
      gridGroupLimits: { [key: string]: number },
      defaultGroupLimit: number,
      groupAlertLimits: { [key: string]: number },
    ) => {
      this.status.setFetching();

      const payload: AlertsRequestT = {
        filters: this.filters.values.map((f) => f.raw),
        gridLabel: gridLabel,
        gridSortReverse: gridSortReverse,
        gridLimits: gridGroupLimits,
        sortOrder: sortOrder,
        sortLabel: sortLabel,
        sortReverse: sortReverse,
        defaultGroupLimit: defaultGroupLimit,
        groupLimits: groupAlertLimits,
      };

      const alertsURI = FormatBackendURI("alerts.json");

      return await FetchGet(
        alertsURI,
        { method: "POST", body: JSON.stringify(payload) },
        this.info.setIsRetrying,
      )
        .then((result) => {
          // we're sending requests with mode=cors so the response should also be type=cors
          // after a few failures in the retry loop we will switch to no-cors
          // if that request comes back as type=opaque then we might be getting
          // redirected by an auth proxy
          if (result.type === "opaque") {
            this.info.setReloadNeeded(true);
          }
          this.info.clearIsRetrying();
          this.status.setProcessing();
          return result.json();
        })
        .then((result) => {
          return this.parseAPIResponse(result);
        })
        .catch((err) => {
          console.trace(err);
          return this.handleFetchError(
            `Can't connect to the API, last error was "${err.message}"`,
          );
        });
    },
  );

  fetchWithThrottle = throttle(this.fetch, 300);

  parseAPIResponse = action((result: APIAlertsResponseT) => {
    if (result.error) {
      this.handleFetchError(result.error);
      return;
    }

    const queryFilters = Array.from(
      new Set(
        this.filters.values
          .map((f) => f.raw)
          .slice()
          .sort(),
      ),
    );
    const responseFilters = Array.from(
      new Set(result.filters.map((m) => m.text).sort()),
    );
    if (JSON.stringify(queryFilters) !== JSON.stringify(responseFilters)) {
      console.info(
        `Got response with filters '${responseFilters}' while expecting results for '${queryFilters}', ignoring`,
      );
      return;
    }

    for (const filter of result.filters) {
      const storedIndex = this.filters.values.findIndex(
        (f) => f.raw === filter.text,
      );
      this.filters.values[storedIndex] = Object.assign(
        this.filters.values[storedIndex],
        {
          applied: true,
          isValid: filter.isValid,
          hits: filter.hits,
          name: filter.name,
          matcher: filter.matcher,
          value: filter.value,
        },
      );
    }

    const updates: Partial<APIAlertsResponseT> = {};
    updates.colors = result.colors;
    updates.grids = result.grids;
    updates.labelNames = result.labelNames;
    updates.silences = result.silences;
    updates.upstreams = result.upstreams;
    updates.receivers = result.receivers;
    this.data = Object.assign(this.data, updates);

    const knowGroups: string[] = [];
    result.grids.map((grid) =>
      grid.alertGroups
        .map((group) => group.id)
        .forEach((id) => {
          knowGroups.push(id);
        }),
    );
    this.ui.purgeGroupAlertLimits(knowGroups);

    // before storing new version check if we need to reload
    if (
      this.info.version !== "unknown" &&
      this.info.version !== result.version
    ) {
      this.info.setUpgradeReady(true);
      this.status.stop();
    }
    // update extra root level keys that are stored under 'info'
    this.info.totalAlerts = result.totalAlerts;
    this.info.version = result.version;
    this.info.timestamp = result.timestamp;
    this.info.authentication = result.authentication;

    // settings exported via API
    this.settings.values = result.settings;

    this.status.setIdle();
  });

  handleFetchError = action((err: string) => {
    this.status.setFailure(err);

    // reset alert counter since we won't be rendering any alerts
    this.info.totalAlerts = 0;

    // all unapplied filters should be marked applied to reset progress indicator
    this.filters.applyAllFilters();

    return { error: err };
  });
}

export {
  AlertStore,
  AlertStoreStatuses,
  FormatBackendURI,
  FormatAPIFilterQuery,
  FormatAlertsQ,
  DecodeLocationSearch,
  UpdateLocationSearch,
  NewUnappliedFilter,
};
