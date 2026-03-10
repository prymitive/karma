package models

import (
	"time"

	"github.com/go-json-experiment/json/jsontext"
)

type jsonWriter struct {
	enc *jsontext.Encoder
	err error
}

func (w *jsonWriter) token(t jsontext.Token) {
	if w.err == nil {
		w.err = w.enc.WriteToken(t)
	}
}

func (w *jsonWriter) beginObject() { w.token(jsontext.BeginObject) }
func (w *jsonWriter) endObject()   { w.token(jsontext.EndObject) }
func (w *jsonWriter) beginArray()  { w.token(jsontext.BeginArray) }
func (w *jsonWriter) endArray()    { w.token(jsontext.EndArray) }

func (w *jsonWriter) key(k string)      { w.token(jsontext.String(k)) }
func (w *jsonWriter) str(s string)      { w.token(jsontext.String(s)) }
func (w *jsonWriter) integer(v int)     { w.token(jsontext.Int(int64(v))) }
func (w *jsonWriter) integer32(v int32) { w.token(jsontext.Int(int64(v))) }
func (w *jsonWriter) boolean(v bool)    { w.token(jsontext.Bool(v)) }

func (w *jsonWriter) time(t time.Time) {
	if w.err == nil {
		var b []byte
		b, w.err = t.MarshalJSON()
		if w.err == nil {
			w.err = w.enc.WriteValue(b)
		}
	}
}

func (w *jsonWriter) strings(ss []string) {
	w.beginArray()
	for _, s := range ss {
		w.str(s)
	}
	w.endArray()
}

func (w *jsonWriter) mapStringInt(m map[string]int) {
	w.beginObject()
	for k, v := range m {
		w.key(k)
		w.integer(v)
	}
	w.endObject()
}

func (w *jsonWriter) mapStringStringSlice(m map[string][]string) {
	w.beginObject()
	for k, v := range m {
		w.key(k)
		w.strings(v)
	}
	w.endObject()
}

func (w *jsonWriter) mapStringString(m map[string]string) {
	w.beginObject()
	for k, v := range m {
		w.key(k)
		w.str(v)
	}
	w.endObject()
}

func (w *jsonWriter) mapStringMapStringString(m map[string]map[string]string) {
	w.beginObject()
	for k, v := range m {
		w.key(k)
		w.mapStringString(v)
	}
	w.endObject()
}
