'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Search, 
  Clipboard, 
  Rocket, 
  Terminal,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface DinoLocalAssistantProps {
  onExecuteCommand?: (tool: string, action: string, params: any) => Promise<any>;
}

interface Note {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

const DinoLocalAssistant: React.FC<DinoLocalAssistantProps> = ({ onExecuteCommand }) => {
  const [activeTab, setActiveTab] = useState('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [clipboardHistory, setClipboardHistory] = useState<any[]>([]);
  
  const [newNoteContent, setNewNoteContent] = useState('');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('');
  
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  
  const [appName, setAppName] = useState('');
  const [pathToOpen, setPathToOpen] = useState('');
  
  const [diskUsage, setDiskUsage] = useState<any>(null);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  const executeCommand = async (tool: string, action: string, params: any = {}) => {
    if (onExecuteCommand) {
      return await onExecuteCommand(tool, action, params);
    } else {
      try {
        const response = await fetch('/api/dino-local', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tool, action, params }),
        });
        return await response.json();
      } catch (error) {
        console.log(`Would execute: ${tool} ${action}`, params);
        return { success: true, message: 'Command logged (no backend connected)' };
      }
    }
  };

  const addNote = async () => {
    if (!newNoteContent.trim()) return;
    
    const result = await executeCommand('notes', 'add', { content: newNoteContent });
    if (result.success) {
      setNewNoteContent('');
      loadNotes();
    }
  };

  const loadNotes = async () => {
    const result = await executeCommand('notes', 'list');
    if (result.success && result.notes) {
      setNotes(result.notes);
    }
  };

  const searchNotes = async () => {
    if (!noteSearchQuery.trim()) {
      loadNotes();
      return;
    }
    
    const result = await executeCommand('notes', 'get', { query: noteSearchQuery });
    if (result.success && result.notes) {
      setNotes(result.notes);
    }
  };

  const deleteNote = async (noteId: string) => {
    const result = await executeCommand('notes', 'delete', { note_id: noteId });
    if (result.success) {
      loadNotes();
    }
  };

  const addEvent = async () => {
    if (!newEventTitle.trim() || !newEventStartTime.trim()) return;
    
    const result = await executeCommand('calendar', 'add', {
      title: newEventTitle,
      description: newEventDescription,
      start_time: newEventStartTime
    });
    
    if (result.success) {
      setNewEventTitle('');
      setNewEventDescription('');
      setNewEventStartTime('');
      loadEvents();
    }
  };

  const loadEvents = async () => {
    const result = await executeCommand('calendar', 'list');
    if (result.success && result.events) {
      setEvents(result.events);
    }
  };

  const searchFiles = async () => {
    if (!fileSearchQuery.trim()) return;
    
    const result = await executeCommand('filesearch', 'search', { query: fileSearchQuery });
    if (result.success && result.files) {
      setSearchResults(result.files);
    }
  };

  const updateFileIndex = async () => {
    await executeCommand('filesearch', 'update_index');
  };

  const loadClipboardHistory = async () => {
    const result = await executeCommand('clipboard', 'history', { limit: 10 });
    if (result.success && result.history) {
      setClipboardHistory(result.history);
    }
  };

  const launchApp = async () => {
    if (!appName.trim()) return;
    await executeCommand('launcher', 'launch', { app_name: appName });
    setAppName('');
  };

  const openPath = async () => {
    if (!pathToOpen.trim()) return;
    await executeCommand('launcher', 'open_path', { path: pathToOpen });
    setPathToOpen('');
  };

  const checkDiskUsage = async () => {
    const result = await executeCommand('shell', 'disk_usage');
    if (result.success && result.usage) {
      setDiskUsage(result.usage);
    }
  };

  const loadRecentFiles = async () => {
    const result = await executeCommand('shell', 'recent_files', { days: 7 });
    if (result.success && result.files) {
      setRecentFiles(result.files.slice(0, 10));
    }
  };

  const clearTempFolders = async () => {
    await executeCommand('shell', 'clear_temp');
  };

  useEffect(() => {
    if (activeTab === 'notes') {
      loadNotes();
    } else if (activeTab === 'calendar') {
      loadEvents();
    } else if (activeTab === 'clipboard') {
      loadClipboardHistory();
    } else if (activeTab === 'shell') {
      checkDiskUsage();
      loadRecentFiles();
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">🦖 DinoLocal Assistant</h1>
          <p className="text-muted-foreground text-sm">
            Offline-only local assistant toolset for productivity and system management
          </p>
          
          <div className="flex gap-2 mt-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'notes' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <FileText className="w-4 h-4" />
              Notes
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'calendar' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('filesearch')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'filesearch' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Search className="w-4 h-4" />
              File Search
            </button>
            <button
              onClick={() => setActiveTab('clipboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'clipboard' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Clipboard className="w-4 h-4" />
              Clipboard
            </button>
            <button
              onClick={() => setActiveTab('launcher')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'launcher' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Rocket className="w-4 h-4" />
              Launcher
            </button>
            <button
              onClick={() => setActiveTab('shell')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'shell' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Shell Utils
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'notes' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">📝 Notes Manager</h2>
              <p className="text-sm text-muted-foreground mb-4">Create, search, and manage your local notes</p>
              
              <div className="flex gap-2 mb-4">
                <textarea
                  placeholder="Write your note here..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="flex-1 p-3 border rounded-lg resize-none bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
                <button
                  onClick={addNote}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors self-start"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  className="flex-1 p-3 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={searchNotes}
                  className="px-4 py-2 border rounded-lg bg-background text-foreground hover:bg-muted transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="bg-muted border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm mb-2">{note.content}</p>
                        <div className="flex gap-2 mb-2">
                          {note.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(note.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">📅 Calendar Manager</h2>
              <p className="text-sm text-muted-foreground mb-4">Schedule and manage local events and reminders</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Event title..."
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="p-3 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="datetime-local"
                  value={newEventStartTime}
                  onChange={(e) => setNewEventStartTime(e.target.value)}
                  className="p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="flex gap-2 mb-4">
                <textarea
                  placeholder="Event description (optional)..."
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  className="flex-1 p-3 border rounded-lg resize-none bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                />
                <button
                  onClick={addEvent}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors self-start"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="bg-muted border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                    )}
                    <p className="text-sm">
                      📅 {new Date(event.start_time).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'filesearch' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">🔍 File Search</h2>
              <p className="text-sm text-muted-foreground mb-4">Index and search your local files with fuzzy matching</p>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search for files..."
                  value={fileSearchQuery}
                  onChange={(e) => setFileSearchQuery(e.target.value)}
                  className="flex-1 p-3 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={searchFiles}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={updateFileIndex}
                  className="px-4 py-2 border rounded-lg bg-background text-foreground hover:bg-muted transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {searchResults.map((file, index) => (
                  <div key={index} className="bg-muted border rounded-lg p-3">
                    <p className="text-sm font-mono">{file}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'clipboard' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">📋 Clipboard Monitor</h2>
              <p className="text-sm text-muted-foreground mb-4">Track your clipboard history with optional encryption</p>
              
              <button
                onClick={loadClipboardHistory}
                className="mb-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Refresh History
              </button>

              <div className="space-y-2">
                {clipboardHistory.map((item, index) => (
                  <div key={index} className="bg-muted border rounded-lg p-3">
                    <p className="text-sm font-mono break-all">{item.content || item}</p>
                    {item.timestamp && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'launcher' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">🚀 App Launcher</h2>
              <p className="text-sm text-muted-foreground mb-4">Launch applications and open file paths</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Launch Application</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="App name (e.g., firefox, code, calculator)"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="flex-1 p-3 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={launchApp}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Rocket className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Open Path</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="File or folder path"
                      value={pathToOpen}
                      onChange={(e) => setPathToOpen(e.target.value)}
                      className="flex-1 p-3 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={openPath}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shell' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">🛠️ Shell Utilities</h2>
              <p className="text-sm text-muted-foreground mb-4">System maintenance and disk usage tools</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <button
                  onClick={checkDiskUsage}
                  className="p-4 border rounded-lg bg-background text-foreground hover:bg-muted transition-colors text-left"
                >
                  <Terminal className="w-5 h-5 mb-2" />
                  <p className="font-medium">Check Disk Usage</p>
                  <p className="text-sm text-muted-foreground">View disk space information</p>
                </button>
                
                <button
                  onClick={loadRecentFiles}
                  className="p-4 border rounded-lg bg-background text-foreground hover:bg-muted transition-colors text-left"
                >
                  <FileText className="w-5 h-5 mb-2" />
                  <p className="font-medium">Recent Files</p>
                  <p className="text-sm text-muted-foreground">Show recently modified files</p>
                </button>
                
                <button
                  onClick={clearTempFolders}
                  className="p-4 border rounded-lg bg-background text-foreground hover:bg-muted transition-colors text-left"
                >
                  <Trash2 className="w-5 h-5 mb-2" />
                  <p className="font-medium">Clear Temp</p>
                  <p className="text-sm text-muted-foreground">Clean temporary folders</p>
                </button>
              </div>

              {diskUsage && (
                <div className="bg-muted border rounded-lg p-4 mb-4">
                  <h4 className="font-semibold mb-2">Disk Usage</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <p className="font-mono">{diskUsage.total_gb} GB</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Used:</span>
                      <p className="font-mono">{diskUsage.used_gb} GB</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Free:</span>
                      <p className="font-mono">{diskUsage.free_gb} GB</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Usage:</span>
                      <p className="font-mono">{diskUsage.usage_percent}%</p>
                    </div>
                  </div>
                </div>
              )}

              {recentFiles.length > 0 && (
                <div className="bg-muted border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Recent Files (Last 7 Days)</h4>
                  <div className="space-y-1">
                    {recentFiles.map((file, index) => (
                      <p key={index} className="text-sm font-mono text-muted-foreground">
                        {file}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DinoLocalAssistant;
