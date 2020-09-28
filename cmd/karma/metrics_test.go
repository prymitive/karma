package main

import "testing"

func TestBoolToFloat64(t *testing.T) {
	ft := boolToFloat64(true)
	if ft != 1 {
		t.Errorf("boolToFloat64(true) returned %f", ft)
	}

	ff := boolToFloat64(false)
	if ff != 0 {
		t.Errorf("boolToFloat64(true) returned %f", ff)
	}
}
