package transform

import (
	"crypto/sha1"
	"io"
	"math/rand"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/slices"

	"github.com/hansrodtang/randomcolor"

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

// ColorLabel update karmaColorMap object with a color object generated
// from label key and value passed here
// It's used to generate unique colors for configured labels
func ColorLabel(colorStore models.LabelsColorMap, key string, val string) {
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
			brightness := ((int32(bc.Red) * 299) + (int32(bc.Green) * 587) + (int32(bc.Blue) * 114)) / 1000
			colorStore[key][val] = models.LabelColors{
				Brightness: brightness,
				Background: bc,
			}
		}
	}
}
