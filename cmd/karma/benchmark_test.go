package main

import (
	"io/ioutil"
	"testing"
)

func BenchmarkCompress(b *testing.B) {
	data, err := ioutil.ReadFile("./tests/compress/alerts.json")
	if err != nil {
		b.Errorf("Failed to read data: %s", err.Error())
	}

	for i := 0; i < b.N; i++ {
		compressed, err := compressResponse(data)
		if err != nil {
			b.Errorf("Failed to compress data: %s", err.Error())
		}
		if len(compressed) == 0 {
			b.Errorf("Got zero bytes compress data")
		}
	}
}

func BenchmarkDecompress(b *testing.B) {
	data, err := ioutil.ReadFile("./tests/compress/alerts.json")
	if err != nil {
		b.Errorf("Failed to read data: %s", err.Error())
	}

	compressed, err := compressResponse(data)
	if err != nil {
		b.Errorf("Failed to compress data: %s", err.Error())
	}

	for i := 0; i < b.N; i++ {
		decompressed, err := decompressCachedResponse(compressed)
		if err != nil {
			b.Errorf("Failed to decompress data: %s", err.Error())
		}
		if len(decompressed) != len(data) {
			b.Errorf("Got %d decompressed bytes, input was %d", len(decompressed), len(data))
		}
	}
}

func BenchmarkCompressionAndDecompression(b *testing.B) {
	data, err := ioutil.ReadFile("./tests/compress/alerts.json")
	if err != nil {
		b.Errorf("Failed to read data: %s", err.Error())
	}

	for i := 0; i < b.N; i++ {
		compressed, err := compressResponse(data)
		if err != nil {
			b.Errorf("Failed to compress data: %s", err.Error())
		}
		if len(compressed) == 0 {
			b.Errorf("Got zero bytes compress data")
		}

		decompressed, err := decompressCachedResponse(compressed)
		if err != nil {
			b.Errorf("Failed to decompress data: %s", err.Error())
		}
		if len(decompressed) != len(data) {
			b.Errorf("Got %d decompressed bytes, input was %d", len(decompressed), len(data))
		}

		if i == 0 {
			ratio := float64(len(compressed)) / float64(len(data))
			b.Logf("Compression ratio: %.2f", ratio)
		}
	}
}
