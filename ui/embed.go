package ui

import "embed"

//go:embed build/* mock/*

// StaticFiles exports build and src directorires as embed.FS
var StaticFiles embed.FS
