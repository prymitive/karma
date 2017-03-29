package randomcolor

import "math"

// Monochrome hue ranges
var Monochrome = Color{
	HueRange:    Range{0, 0},
	LowerBounds: []Range{{0, 0}, {100, 0}},
}

// Red hue ranges
var Red = Color{
	HueRange:    Range{-26, 18},
	LowerBounds: []Range{{20, 100}, {30, 92}, {40, 89}, {50, 85}, {60, 78}, {70, 70}, {80, 60}, {90, 55}, {100, 50}},
}

// Orange hue ranges
var Orange = Color{
	HueRange:    Range{19, 46},
	LowerBounds: []Range{{20, 100}, {30, 93}, {40, 88}, {50, 86}, {60, 85}, {70, 70}, {100, 70}},
}

// Yellow hue ranges
var Yellow = Color{
	HueRange:    Range{47, 62},
	LowerBounds: []Range{{25, 100}, {40, 94}, {50, 89}, {60, 86}, {70, 84}, {80, 82}, {90, 80}, {100, 75}},
}

// Green hue ranges
var Green = Color{
	HueRange:    Range{63, 178},
	LowerBounds: []Range{{30, 100}, {40, 90}, {50, 85}, {60, 81}, {70, 74}, {80, 64}, {90, 50}, {100, 40}},
}

// Blue hue ranges
var Blue = Color{
	HueRange:    Range{179, 257},
	LowerBounds: []Range{{20, 100}, {30, 86}, {40, 80}, {50, 74}, {60, 60}, {70, 52}, {80, 44}, {90, 39}, {100, 35}},
}

// Purple hue ranges
var Purple = Color{
	HueRange:    Range{258, 282},
	LowerBounds: []Range{{20, 100}, {30, 87}, {40, 79}, {50, 70}, {60, 65}, {70, 59}, {80, 52}, {90, 45}, {100, 42}},
}

// Pink hue ranges
var Pink = Color{
	HueRange:    Range{283, 334},
	LowerBounds: []Range{{20, 100}, {30, 90}, {40, 86}, {60, 84}, {80, 80}, {90, 75}, {100, 73}},
}

// Random hue ranges
var Random = Color{
	HueRange:    Range{0, 360},
	LowerBounds: []Range{},
}

var colors = []Color{Monochrome, Red, Orange, Yellow, Green, Blue, Purple, Pink}

// ColorInfo returns the hue range that matches the supplied hue.
// If no range can be found it returns Monochrome.
func ColorInfo(hue int) Color {
	if hue >= 334 && hue <= 360 {
		hue = hue - 360
	}

	for _, color := range colors {
		if hue >= color.HueRange[0] && hue <= color.HueRange[1] {
			return color
		}
	}
	return Monochrome
}

// HSV represents a cylindrical coordinate of points in an RGB color model.
// Values are in the range 0 to 1.
type HSV struct {
	H, S, V float64
}

// RGBA returns the alpha-premultiplied red, green, blue and alpha values
// for the HSV.
func (c HSV) RGBA() (uint32, uint32, uint32, uint32) {

	var R, G, B float64

	hI := math.Floor(c.H * 6)
	f := c.H*6 - hI
	p := c.V * (1.0 - c.S)
	q := c.V * (1.0 - f*c.S)
	t := c.V * (1.0 - (1.0-f)*c.S)

	switch hI {
	case 0:
		R, G, B = c.V, t, p
	case 1:
		R, G, B = q, c.V, p
	case 2:
		R, G, B = p, c.V, t
	case 3:
		R, G, B = p, q, c.V
	case 4:
		R, G, B = t, p, c.V
	case 5:
		R, G, B = c.V, p, q
	}

	r := uint8((R * 255) + 0.5)
	g := uint8((G * 255) + 0.5)
	b := uint8((B * 255) + 0.5)

	return uint32(r) * 0x101, uint32(g) * 0x101, uint32(b) * 0x101, 0xffff
}
