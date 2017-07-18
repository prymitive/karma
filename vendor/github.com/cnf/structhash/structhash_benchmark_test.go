package structhash

import (
	"encoding/json"
	"testing"
)

type BenchData struct {
	Bool   bool
	String string
	Int    int
	Uint   uint
	Map    map[string]*BenchData
	Slice  []*BenchData
	Struct *BenchData
}

type BenchTags struct {
	Bool   bool   `json:"f1" hash:"name:f1"`
	String string `json:"f2" hash:"name:f2"`
	Int    int    `json:"f3" hash:"name:f3"`
	Uint   uint   `json:"f4" hash:"name:f4"`
}

func benchDataSimple() *BenchData {
	return &BenchData{true, "simple", -123, 321, nil, nil, nil}
}

func benchDataFull() *BenchData {
	foo := benchDataSimple()
	bar := benchDataSimple()

	m := make(map[string]*BenchData)
	m["foo"] = foo
	m["bar"] = bar

	s := []*BenchData{
		foo,
		bar,
	}

	return &BenchData{true, "hello", -123, 321, m, s, foo}
}

func benchDataTags() *BenchTags {
	return &BenchTags{true, "tags", -123, 321}
}

func BenchmarkSimpleJSON(b *testing.B) {
	s := benchDataSimple()

	for i := 0; i < b.N; i++ {
		json.Marshal(s)
	}
}

func BenchmarkSimpleDump(b *testing.B) {
	s := benchDataSimple()

	for i := 0; i < b.N; i++ {
		Dump(s, 1)
	}
}

func BenchmarkFullJSON(b *testing.B) {
	s := benchDataFull()

	for i := 0; i < b.N; i++ {
		json.Marshal(s)
	}
}

func BenchmarkFullDump(b *testing.B) {
	s := benchDataFull()

	for i := 0; i < b.N; i++ {
		Dump(s, 1)
	}
}

func BenchmarkTagsJSON(b *testing.B) {
	s := benchDataTags()

	for i := 0; i < b.N; i++ {
		json.Marshal(s)
	}
}

func BenchmarkTagsDump(b *testing.B) {
	s := benchDataTags()

	for i := 0; i < b.N; i++ {
		Dump(s, 1)
	}
}
