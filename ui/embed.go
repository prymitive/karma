package ui

import "embed"

//go:embed build/* src/*

// StaticFiles exports build and src directorires as embed.FS
var StaticFiles embed.FS
