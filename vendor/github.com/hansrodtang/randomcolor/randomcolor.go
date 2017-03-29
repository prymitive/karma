package randomcolor

import (
	"image/color"
	"math/rand"
)

// Luminosity stores the level of luminosity for the generated color.
type Luminosity int

const (
	// LIGHT is used to generate light colors
	LIGHT Luminosity = iota
	// DARK is used to generate dark colors
	DARK
	// BRIGHT is used to generator bright colors
	BRIGHT
	// RANDOM is used to generate colors of random luminosity
	RANDOM
)

// New returns a random color in the specified hue and luminosity.
func New(hue Color, lum Luminosity) color.Color {

	c := HSV{}
	c.H = setHue(hue)
	c.S = setSaturation(c, hue, lum)
	c.V = setBrightness(c, lum)

	if c.H == 0 {
		c.H = 1
	}
	if c.H == 360 {
		c.H = 359
	}

	// Rebase the h,s,v values
	c.H = c.H / 360
	c.S = c.S / 100
	c.V = c.V / 100

	return c
}

// Range represents a range between lower (Range[0]) and upper bounds (Range[1]).
type Range [2]int

// Color represents a color in a specified range
type Color struct {
	HueRange    Range
	LowerBounds []Range
}

// SaturationRange returns the minimum and maximum saturation for the color.
func (c Color) SaturationRange() Range {
	sMin := c.LowerBounds[0][0]
	sMax := c.LowerBounds[len(c.LowerBounds)-1][0]

	return Range{sMin, sMax}
}

// BrightnessRange returns the minimum and maximum brigthness for the color.
func (c Color) BrightnessRange() Range {
	bMin := c.LowerBounds[len(c.LowerBounds)-1][1]
	bMax := c.LowerBounds[0][1]

	return Range{bMin, bMax}
}

func setHue(c Color) float64 {
	hue := randWithin(c.HueRange[0], c.HueRange[1])

	if hue < 0 {
		hue = 360 + hue
	}
	return float64(hue)
}

func setSaturation(hsv HSV, hue Color, lum Luminosity) float64 {
	if hue.HueRange == Monochrome.HueRange {
		return 0
	}

	saturationRange := ColorInfo(int(hsv.H)).SaturationRange()

	var sMin = saturationRange[0]
	var sMax = saturationRange[1]

	switch lum {
	case BRIGHT:
		sMin = 55
	case DARK:
		sMin = sMax - 10
	case LIGHT:
		sMax = 55
	case RANDOM:
		return float64(randWithin(0, 100))
	}

	return float64(randWithin(sMin, sMax))
}

func setBrightness(hsv HSV, lum Luminosity) float64 {
	bMin := getMinimumBrightness(hsv)
	bMax := 100

	switch lum {
	case DARK:
		bMax = bMin + 20
	case LIGHT:
		bMin = (bMax + bMin) / 2
	case BRIGHT:
		//
	default:
		bMin = 0
		bMax = 100
	}
	return float64(randWithin(bMin, bMax))
}

func getMinimumBrightness(hsv HSV) int {
	var lowerBounds []Range
	lowerBounds = ColorInfo(int(hsv.H)).LowerBounds
	for i := 0; i < (len(lowerBounds) - 1); i++ {
		s1 := float64(lowerBounds[i][0])
		v1 := float64(lowerBounds[i][1])

		s2 := float64(lowerBounds[i+1][0])
		v2 := float64(lowerBounds[i+1][1])

		if hsv.S >= s1 && hsv.S <= s2 {
			m := (v2 - v1) / (s2 - s1)
			b := v1 - m*s1
			return int(m*hsv.S + b)
		}
	}
	return 0
}

func randWithin(first, last int) int {
	return first + rand.Intn(last+1-first)
}
