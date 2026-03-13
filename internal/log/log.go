package log

import (
	"fmt"
	"log/slog"
	"os"
)

var Level = new(slog.LevelVar)

func init() {
	Level.Set(slog.LevelInfo)
}

func SetLevel(level slog.Level) {
	Level.Set(level)
}

func ParseLevel(value string) (slog.Level, error) {
	switch value {
	case "debug":
		return slog.LevelDebug, nil
	case "info":
		return slog.LevelInfo, nil
	case "warning":
		return slog.LevelWarn, nil
	case "error":
		return slog.LevelError, nil
	default:
		return slog.LevelInfo, fmt.Errorf("unknown log level '%s'", value)
	}
}

func SetupLogger(format string, timestamps bool) error {
	handler, err := buildHandler(format, timestamps)
	if err != nil {
		return err
	}
	slog.SetDefault(slog.New(handler))
	return nil
}

func buildHandler(format string, timestamps bool) (slog.Handler, error) {
	opts := &slog.HandlerOptions{Level: Level}
	if !timestamps {
		opts.ReplaceAttr = func(_ []string, attr slog.Attr) slog.Attr {
			if attr.Key == slog.TimeKey {
				return slog.Attr{}
			}
			return attr
		}
	}

	switch format {
	case "text":
		return slog.NewTextHandler(os.Stderr, opts), nil
	case "json":
		return slog.NewJSONHandler(os.Stderr, opts), nil
	default:
		return nil, fmt.Errorf("unknown log format '%s'", format)
	}
}
