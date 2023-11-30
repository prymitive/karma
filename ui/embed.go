package ui

import "embed"

//go:embed dist/* mock/*

// StaticFiles exports build and src directorires as embed.FS
var StaticFiles embed.FS
