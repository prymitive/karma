package models

// Filter holds returned data on any filter passed by the user as part of the query
type Filter struct {
	Text    string `json:"text"`
	Name    string `json:"name"`
	Matcher string `json:"matcher"`
	Value   string `json:"value"`
	Hits    int    `json:"hits"`
	IsValid bool   `json:"isValid"`
}

// Color is used by UnseeLabelColor to reprenset colors as RGBA
type Color struct {
	Red   uint8 `json:"red"`
	Green uint8 `json:"green"`
	Blue  uint8 `json:"blue"`
	Alpha uint8 `json:"alpha"`
}

// LabelColors holds color information for labels that should be colored in the UI
// every configured label will have a distinct coloring for each value
type LabelColors struct {
	Font       Color `json:"font"`
	Background Color `json:"background"`
}

// LabelsColorMap is a map of "Label Key" -> "Label Value" -> UnseeLabelColors
type LabelsColorMap map[string]map[string]LabelColors

// LabelsCountMap is a map of "Label Key" -> "Label Value" -> number of occurence
type LabelsCountMap map[string]map[string]int

// AlertsResponse is the structure of JSON response UI will use to get alert data
type AlertsResponse struct {
	Status      string                 `json:"status"`
	Timestamp   string                 `json:"timestamp"`
	Version     string                 `json:"version"`
	Upstreams   AlertmanagerAPISummary `json:"upstreams"`
	AlertGroups map[string]AlertGroup  `json:"groups"`
	TotalAlerts int                    `json:"totalAlerts"`
	Colors      LabelsColorMap         `json:"colors"`
	Filters     []Filter               `json:"filters"`
	Counters    LabelsCountMap         `json:"counters"`
}

// Autocomplete is the structure of autocomplete object for filter hints
// this is internal represenation, not what's returned to the user
type Autocomplete struct {
	Value  string   `json:"value"`
	Tokens []string `json:"tokens"`
}
