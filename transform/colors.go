package transform

import (
	"crypto/sha1"
	"io"
	"math/rand"
	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/models"

	"github.com/hansrodtang/randomcolor"
)

func labelToSeed(key string, val string) int64 {
	h := sha1.New()
	io.WriteString(h, key)
	io.WriteString(h, val)
	var seed int64
	for _, i := range h.Sum(nil) {
		seed += int64(i)
	}
	return seed
}

// ColorLabel update UnseeColorMap object with a color object generated
// from label key and value passed here
// It's used to generate unique colors for configured labels
func ColorLabel(colorStore models.UnseeColorMap, key string, val string) {
	if stringInSlice(config.Config.ColorLabels, key) == true {
		if _, found := colorStore[key]; !found {
			colorStore[key] = make(map[string]models.UnseeLabelColor)
		}
		if _, found := colorStore[key][val]; !found {
			rand.Seed(labelToSeed(key, val))
			color := randomcolor.New(randomcolor.Random, randomcolor.LIGHT)
			red, green, blue, alpha := color.RGBA()
			bc := models.UnseeColor{
				Red:   uint8(red >> 8),
				Green: uint8(green >> 8),
				Blue:  uint8(blue >> 8),
				Alpha: uint8(alpha >> 8),
			}
			// check if color is bright or dark and pick the right background
			// uses https://www.w3.org/WAI/ER/WD-AERT/#color-contrast method
			var brightness int32
			brightness = ((int32(bc.Red) * 299) + (int32(bc.Green) * 587) + (int32(bc.Blue) * 114)) / 1000
			var fc models.UnseeColor
			if brightness <= 125 {
				// background color is dark, use white font
				fc = models.UnseeColor{
					Red:   255,
					Green: 255,
					Blue:  255,
					Alpha: 255,
				}
			} else {
				// background color is bright, use dark font
				fc = models.UnseeColor{
					Red:   44,
					Green: 62,
					Blue:  80,
					Alpha: 255,
				}
			}

			colorStore[key][val] = models.UnseeLabelColor{
				Font:       fc,
				Background: bc,
			}
		}
	}
}
