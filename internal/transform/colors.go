package transform

import (
	"crypto/sha1"
	"io"
	"math/rand"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/slices"

	"github.com/hansrodtang/randomcolor"
	plcolors "gopkg.in/go-playground/colors.v1"

	log "github.com/sirupsen/logrus"
)

func labelToSeed(key string, val string) int64 {
	h := sha1.New()

	_, err := io.WriteString(h, key)
	if err != nil {
		log.Errorf("Failed to write label key '%s' to the seed sha1: %s", key, err)
	}

	_, err = io.WriteString(h, val)
	if err != nil {
		log.Errorf("Failed to write label value '%s' to the seed sha1: %s", val, err)
	}

	var seed int64
	for _, i := range h.Sum(nil) {
		seed += int64(i)
	}
	return seed
}

func rgbToBrightness(r, g, b uint8) int32 {
	return ((int32(r) * 299) + (int32(g) * 587) + (int32(b) * 114)) / 1000
}

func parseCustomColor(colorStore models.LabelsColorMap, key, val, customColor string) {
	color, err := plcolors.Parse(customColor)
	if err != nil {
		log.Warningf("Failed to parse custom color for %s=%s: %s", key, val, err)
		return
	}
	rgb := color.ToRGB()
	bc := models.Color{
		Red:   rgb.R,
		Green: rgb.G,
		Blue:  rgb.B,
		Alpha: 255,
	}
	brightness := rgbToBrightness(bc.Red, bc.Green, bc.Blue)
	if _, found := colorStore[key]; !found {
		colorStore[key] = make(map[string]models.LabelColors)
	}
	colorStore[key][val] = models.LabelColors{
		Brightness: brightness,
		Background: bc.ToString(),
	}
}

// ColorLabel update karmaColorMap object with a color object generated
// from label key and value passed here
// It's used to generate unique colors for configured labels
func ColorLabel(colorStore models.LabelsColorMap, key string, val string) {
	// first handle custom colors
	_, ok := config.Config.Labels.Color.Custom[key]
	if ok {
		for _, colorRule := range config.Config.Labels.Color.Custom[key] {
			if colorRule.Value == val {
				parseCustomColor(colorStore, key, val, colorRule.Color)
				return
			}

			if colorRule.CompiledRegex != nil && colorRule.CompiledRegex.MatchString(val) {
				parseCustomColor(colorStore, key, val, colorRule.Color)
				return
			}
		}
	}

	// if no custom color is found then generate unique colors if needed
	if slices.StringInSlice(config.Config.Labels.Color.Unique, key) {
		if _, found := colorStore[key]; !found {
			colorStore[key] = make(map[string]models.LabelColors)
		}
		if _, found := colorStore[key][val]; !found {
			rand.Seed(labelToSeed(key, val))
			color := randomcolor.New(randomcolor.Random, randomcolor.LIGHT)
			red, green, blue, alpha := color.RGBA()
			bc := models.Color{
				Red:   uint8(red >> 8),
				Green: uint8(green >> 8),
				Blue:  uint8(blue >> 8),
				Alpha: uint8(alpha >> 8),
			}
			// check if color is bright or dark and pick the right background
			// uses https://www.w3.org/WAI/ER/WD-AERT/#color-contrast method
			brightness := rgbToBrightness(bc.Red, bc.Green, bc.Blue)
			colorStore[key][val] = models.LabelColors{
				Brightness: brightness,
				Background: bc.ToString(),
			}
		}
	}
}
