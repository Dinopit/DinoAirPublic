# 🦖 DinoLocal Assistant Toolset

A standalone, offline assistant toolset designed for local operations. This toolset operates entirely offline and is lightweight enough to run on low-spec hardware.

## Features

- **Notes Manager**: Create, search, and manage local notes with tagging
- **Calendar Manager**: Local event scheduling and reminders
- **File Search**: Index and search local files with fuzzy matching
- **Clipboard Monitor**: Track clipboard history with optional encryption
- **App Launcher**: Launch applications and open file paths
- **Shell Utilities**: System maintenance and disk usage tools

## Usage

### Command Line Interface

```bash
python main.py --tool notes --action add --input "My note content"
python main.py --tool calendar --action add --title "Meeting" --start-time "2024-01-01T10:00:00"
python main.py --tool filesearch --action search --query "document"
python main.py --tool clipboard --action history --limit 10
python main.py --tool launcher --action launch --app-name "firefox"
python main.py --tool shell --action disk_usage
```

### Web Interface

The toolset integrates with DinoAir's web GUI as the "Local Tools" tab, providing a user-friendly interface for all functionality.

## Privacy & Security

- **100% Offline**: No network calls or external dependencies
- **Local Storage**: All data stored locally in JSON/SQLite files
- **Optional Encryption**: Clipboard history can be encrypted
- **Zero Telemetry**: No data collection or tracking

## Requirements

- Python 3.7+
- No external dependencies (uses only Python standard library)
