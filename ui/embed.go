package ui

import "embed"

//go:embed dist/* mock/*

// StaticFiles exports build and src directories as embed.FS
var StaticFiles embed.FS
