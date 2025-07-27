#!/usr/bin/env python3
"""
🦖 DinoLocal Assistant Toolset – Standalone Implementation
A completely offline, lightweight assistant toolset for local operations.

Core Goals:
- Offline only: Never requires a network call
- Lightweight: Run on low-spec hardware (4-8GB RAM)
- LLM-triggerable: Designed for CLI/memory-bound model interaction
- Modular: Users can opt in/out of tools
- Secure: Zero telemetry, local encryption optional
"""

import os
import sys
import json
import sqlite3
import subprocess
import platform
import glob
import pickle
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import tempfile
import shutil

class DinoLocalConfig:
    def __init__(self):
        self.base_dir = Path.home() / ".dino_local_assistant"
        self.data_dir = self.base_dir / "data"
        self.notes_file = self.data_dir / "notes.json"
        self.calendar_db = self.data_dir / "calendar.db"
        self.search_index = self.data_dir / "search_index.pkl"
        self.clipboard_file = self.data_dir / "clipboard_history.json"
        
        self.base_dir.mkdir(exist_ok=True)
        self.data_dir.mkdir(exist_ok=True)

class NoteManager:
    def __init__(self, config: DinoLocalConfig):
        self.config = config
        self.notes_file = config.notes_file
        self._ensure_notes_file()
    
    def _ensure_notes_file(self):
        if not self.notes_file.exists():
            with open(self.notes_file, 'w') as f:
                json.dump([], f)
    
    def _load_notes(self) -> List[Dict]:
        try:
            with open(self.notes_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_notes(self, notes: List[Dict]):
        with open(self.notes_file, 'w') as f:
            json.dump(notes, f, indent=2, default=str)
    
    def add_note(self, content: str, tags: List[str] = None) -> str:
        notes = self._load_notes()
        note_id = str(len(notes) + 1)
        note = {
            "id": note_id,
            "content": content,
            "tags": tags or [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        notes.append(note)
        self._save_notes(notes)
        return note_id
    
    def get_note(self, query: str) -> List[Dict]:
        notes = self._load_notes()
        query_lower = query.lower()
        matching_notes = []
        
        for note in notes:
            if (query_lower in note["content"].lower() or 
                any(query_lower in tag.lower() for tag in note.get("tags", []))):
                matching_notes.append(note)
        
        return matching_notes
    
    def list_notes(self) -> List[Dict]:
        return self._load_notes()
    
    def delete_note(self, note_id: str) -> bool:
        notes = self._load_notes()
        original_length = len(notes)
        notes = [note for note in notes if note["id"] != note_id]
        
        if len(notes) < original_length:
            self._save_notes(notes)
            return True
        return False

class CalendarManager:
    def __init__(self, config: DinoLocalConfig):
        self.config = config
        self.db_path = config.calendar_db
        self._init_database()
    
    def _init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                start_time TEXT NOT NULL,
                end_time TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        conn.commit()
        conn.close()
    
    def create_event(self, title: str, start_time: str, description: str = "", end_time: str = "") -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO events (title, description, start_time, end_time, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (title, description, start_time, end_time, now, now))
        
        event_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return event_id
    
    def get_events(self, start_date: str = None, end_date: str = None) -> List[Dict]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if start_date and end_date:
            cursor.execute('''
                SELECT * FROM events 
                WHERE start_time >= ? AND start_time <= ?
                ORDER BY start_time
            ''', (start_date, end_date))
        else:
            cursor.execute('SELECT * FROM events ORDER BY start_time')
        
        events = []
        for row in cursor.fetchall():
            events.append({
                "id": row[0],
                "title": row[1],
                "description": row[2],
                "start_time": row[3],
                "end_time": row[4],
                "created_at": row[5],
                "updated_at": row[6]
            })
        
        conn.close()
        return events

class FileSearch:
    def __init__(self, config: DinoLocalConfig):
        self.config = config
        self.index_file = config.search_index
        self.search_paths = [
            Path.home() / "Documents",
            Path.home() / "Downloads",
            Path.home() / "Desktop"
        ]
    
    def _build_index(self) -> Dict[str, List[str]]:
        index = {}
        
        for search_path in self.search_paths:
            if search_path.exists():
                for file_path in search_path.rglob("*"):
                    if file_path.is_file():
                        file_name = file_path.name.lower()
                        file_path_str = str(file_path)
                        
                        words = file_name.replace(".", " ").replace("_", " ").replace("-", " ").split()
                        for word in words:
                            if word not in index:
                                index[word] = []
                            if file_path_str not in index[word]:
                                index[word].append(file_path_str)
        
        return index
    
    def update_index(self):
        index = self._build_index()
        with open(self.index_file, 'wb') as f:
            pickle.dump(index, f)
    
    def _load_index(self) -> Dict[str, List[str]]:
        try:
            with open(self.index_file, 'rb') as f:
                return pickle.load(f)
        except (FileNotFoundError, pickle.PickleError):
            self.update_index()
            return self._load_index()
    
    def search(self, query: str) -> List[str]:
        index = self._load_index()
        query_words = query.lower().split()
        
        matching_files = set()
        for word in query_words:
            for indexed_word, files in index.items():
                if word in indexed_word:
                    matching_files.update(files)
        
        existing_files = [f for f in matching_files if Path(f).exists()]
        return sorted(existing_files)

class ClipboardMonitor:
    def __init__(self, config: DinoLocalConfig):
        self.config = config
        self.clipboard_file = config.clipboard_file
        self._ensure_clipboard_file()
    
    def _ensure_clipboard_file(self):
        if not self.clipboard_file.exists():
            with open(self.clipboard_file, 'w') as f:
                json.dump([], f)
    
    def _load_history(self) -> List[Dict]:
        try:
            with open(self.clipboard_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_history(self, history: List[Dict]):
        with open(self.clipboard_file, 'w') as f:
            json.dump(history, f, indent=2, default=str)
    
    def get_clipboard_content(self) -> str:
        try:
            if platform.system() == "Darwin":  # macOS
                result = subprocess.run(['pbpaste'], capture_output=True, text=True)
                return result.stdout
            elif platform.system() == "Linux":
                result = subprocess.run(['xclip', '-selection', 'clipboard', '-o'], capture_output=True, text=True)
                return result.stdout
            elif platform.system() == "Windows":
                try:
                    import win32clipboard
                    win32clipboard.OpenClipboard()
                    data = win32clipboard.GetClipboardData()
                    win32clipboard.CloseClipboard()
                    return data
                except ImportError:
                    return ""
        except Exception:
            return ""
    
    def log_clipboard(self, content: str):
        history = self._load_history()
        entry = {
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        history.append(entry)
        
        if len(history) > 100:
            history = history[-100:]
        
        self._save_history(history)
    
    def get_history(self, limit: int = 10) -> List[Dict]:
        history = self._load_history()
        return history[-limit:]

class AppLauncher:
    def __init__(self, config: DinoLocalConfig):
        self.config = config
        self.system = platform.system()
    
    def _get_installed_apps(self) -> List[Dict]:
        apps = []
        
        if self.system == "Darwin":  # macOS
            app_dirs = ["/Applications", "/System/Applications"]
            for app_dir in app_dirs:
                if os.path.exists(app_dir):
                    for item in os.listdir(app_dir):
                        if item.endswith(".app"):
                            apps.append({
                                "name": item.replace(".app", ""),
                                "path": os.path.join(app_dir, item)
                            })
        
        elif self.system == "Linux":
            app_dirs = ["/usr/share/applications", "/usr/local/share/applications"]
            for app_dir in app_dirs:
                if os.path.exists(app_dir):
                    for item in os.listdir(app_dir):
                        if item.endswith(".desktop"):
                            apps.append({
                                "name": item.replace(".desktop", ""),
                                "path": os.path.join(app_dir, item)
                            })
        
        elif self.system == "Windows":
            import winreg
            try:
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall")
                for i in range(winreg.QueryInfoKey(key)[0]):
                    subkey_name = winreg.EnumKey(key, i)
                    subkey = winreg.OpenKey(key, subkey_name)
                    try:
                        name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                        apps.append({"name": name, "path": ""})
                    except FileNotFoundError:
                        pass
                    winreg.CloseKey(subkey)
                winreg.CloseKey(key)
            except Exception:
                pass
        
        return apps
    
    def launch_app(self, app_name: str) -> bool:
        try:
            if self.system == "Darwin":
                subprocess.run(['open', '-a', app_name], check=True)
            elif self.system == "Linux":
                subprocess.run([app_name], check=True)
            elif self.system == "Windows":
                subprocess.run(['start', app_name], shell=True, check=True)
            return True
        except subprocess.CalledProcessError:
            return False
    
    def open_path(self, path: str) -> bool:
        try:
            if self.system == "Darwin":
                subprocess.run(['open', path], check=True)
            elif self.system == "Linux":
                subprocess.run(['xdg-open', path], check=True)
            elif self.system == "Windows":
                subprocess.run(['explorer', path], check=True)
            return True
        except subprocess.CalledProcessError:
            return False

class ShellUtils:
    def __init__(self, config: DinoLocalConfig):
        self.config = config
    
    def list_recent_files(self, directory: str = None, days: int = 7) -> List[str]:
        if directory is None:
            directory = str(Path.home())
        
        cutoff_time = datetime.now() - timedelta(days=days)
        recent_files = []
        
        try:
            for root, dirs, files in os.walk(directory):
                for file in files:
                    file_path = os.path.join(root, file)
                    try:
                        mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                        if mtime > cutoff_time:
                            recent_files.append(file_path)
                    except (OSError, ValueError):
                        continue
        except PermissionError:
            pass
        
        return sorted(recent_files, key=lambda x: os.path.getmtime(x), reverse=True)
    
    def clear_temp_folders(self) -> Dict[str, int]:
        cleared = {"files": 0, "folders": 0}
        temp_dirs = [tempfile.gettempdir()]
        
        for temp_dir in temp_dirs:
            try:
                for item in os.listdir(temp_dir):
                    item_path = os.path.join(temp_dir, item)
                    try:
                        if os.path.isfile(item_path):
                            os.unlink(item_path)
                            cleared["files"] += 1
                        elif os.path.isdir(item_path):
                            shutil.rmtree(item_path)
                            cleared["folders"] += 1
                    except (PermissionError, OSError):
                        continue
            except (PermissionError, OSError):
                continue
        
        return cleared
    
    def check_disk_usage(self, path: str = None) -> Dict[str, float]:
        if path is None:
            path = str(Path.home())
        
        try:
            usage = shutil.disk_usage(path)
            total_gb = usage.total / (1024**3)
            used_gb = (usage.total - usage.free) / (1024**3)
            free_gb = usage.free / (1024**3)
            
            return {
                "total_gb": round(total_gb, 2),
                "used_gb": round(used_gb, 2),
                "free_gb": round(free_gb, 2),
                "usage_percent": round((used_gb / total_gb) * 100, 2)
            }
        except OSError:
            return {"error": "Unable to check disk usage"}

class DinoLocalAgent:
    def __init__(self):
        self.config = DinoLocalConfig()
        self.notes = NoteManager(self.config)
        self.calendar = CalendarManager(self.config)
        self.file_search = FileSearch(self.config)
        self.clipboard = ClipboardMonitor(self.config)
        self.launcher = AppLauncher(self.config)
        self.shell_utils = ShellUtils(self.config)
    
    def execute_command(self, tool: str, action: str, **kwargs) -> Dict[str, Any]:
        try:
            if tool == "notes":
                if action == "add":
                    note_id = self.notes.add_note(kwargs.get("content", ""), kwargs.get("tags", []))
                    return {"success": True, "note_id": note_id}
                elif action == "get":
                    notes = self.notes.get_note(kwargs.get("query", ""))
                    return {"success": True, "notes": notes}
                elif action == "list":
                    notes = self.notes.list_notes()
                    return {"success": True, "notes": notes}
                elif action == "delete":
                    deleted = self.notes.delete_note(kwargs.get("note_id", ""))
                    return {"success": deleted}
            
            elif tool == "calendar":
                if action == "add":
                    event_id = self.calendar.create_event(
                        kwargs.get("title", ""),
                        kwargs.get("start_time", ""),
                        kwargs.get("description", ""),
                        kwargs.get("end_time", "")
                    )
                    return {"success": True, "event_id": event_id}
                elif action == "list":
                    events = self.calendar.get_events(
                        kwargs.get("start_date"),
                        kwargs.get("end_date")
                    )
                    return {"success": True, "events": events}
            
            elif tool == "filesearch":
                if action == "search":
                    files = self.file_search.search(kwargs.get("query", ""))
                    return {"success": True, "files": files}
                elif action == "update_index":
                    self.file_search.update_index()
                    return {"success": True, "message": "Index updated"}
            
            elif tool == "clipboard":
                if action == "get":
                    content = self.clipboard.get_clipboard_content()
                    return {"success": True, "content": content}
                elif action == "history":
                    history = self.clipboard.get_history(kwargs.get("limit", 10))
                    return {"success": True, "history": history}
            
            elif tool == "launcher":
                if action == "launch":
                    success = self.launcher.launch_app(kwargs.get("app_name", ""))
                    return {"success": success}
                elif action == "open_path":
                    success = self.launcher.open_path(kwargs.get("path", ""))
                    return {"success": success}
            
            elif tool == "shell":
                if action == "recent_files":
                    files = self.shell_utils.list_recent_files(
                        kwargs.get("directory"),
                        kwargs.get("days", 7)
                    )
                    return {"success": True, "files": files}
                elif action == "clear_temp":
                    cleared = self.shell_utils.clear_temp_folders()
                    return {"success": True, "cleared": cleared}
                elif action == "disk_usage":
                    usage = self.shell_utils.check_disk_usage(kwargs.get("path"))
                    return {"success": True, "usage": usage}
            
            return {"success": False, "error": "Unknown tool or action"}
        
        except Exception as e:
            return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="DinoLocal Assistant Toolset")
    parser.add_argument("--tool", required=True, choices=["notes", "calendar", "filesearch", "clipboard", "launcher", "shell"])
    parser.add_argument("--action", required=True)
    parser.add_argument("--input", help="Input content")
    parser.add_argument("--query", help="Search query")
    parser.add_argument("--title", help="Event title")
    parser.add_argument("--start-time", help="Event start time")
    parser.add_argument("--description", help="Event description")
    parser.add_argument("--app-name", help="Application name to launch")
    parser.add_argument("--path", help="File or directory path")
    parser.add_argument("--days", type=int, default=7, help="Number of days for recent files")
    parser.add_argument("--limit", type=int, default=10, help="Limit for results")
    
    args = parser.parse_args()
    
    agent = DinoLocalAgent()
    
    kwargs = {}
    if args.input:
        kwargs["content"] = args.input
    if args.query:
        kwargs["query"] = args.query
    if args.title:
        kwargs["title"] = args.title
    if args.start_time:
        kwargs["start_time"] = args.start_time
    if args.description:
        kwargs["description"] = args.description
    if args.app_name:
        kwargs["app_name"] = args.app_name
    if args.path:
        kwargs["path"] = args.path
    if args.days:
        kwargs["days"] = args.days
    if args.limit:
        kwargs["limit"] = args.limit
    
    result = agent.execute_command(args.tool, args.action, **kwargs)
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    main()
