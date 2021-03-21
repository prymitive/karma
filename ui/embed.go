package ui

import "embed"

//go:embed build/* src/*

var StaticFiles embed.FS
