'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Search, Database, Settings, Trash2, Download, Eye } from 'lucide-react';

/**
 * Knowledge Base Management Component
 * Provides interface for managing AI memory and knowledge extraction
 */
export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState('extract');
  const [extractText, setExtractText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [knowledgeSummary, setKnowledgeSummary] = useState(null);
  const [memorySettings, setMemorySettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sample data for demonstration when API is not available
  const sampleSummary = {
    total_memories: 42,
    total_entities: 156,
    total_facts: 89,
    entity_types: {
      person: 23,
      location: 18,
      number: 12,
      date: 8
    },
    recent_memories: [
      { id: '1', created_at: '2024-01-15T10:30:00Z', entity_count: 3, fact_count: 2 },
      { id: '2', created_at: '2024-01-14T15:20:00Z', entity_count: 5, fact_count: 3 }
    ]
  };

  const sampleSettings = {
    memory_enabled: true,
    retention_days: null,
    share_anonymized: false,
    auto_extract: true
  };

  useEffect(() => {
    loadKnowledgeSummary();
    loadMemorySettings();
  }, []);

  const loadKnowledgeSummary = async () => {
    try {
      const response = await fetch('/api/knowledge/summary', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setKnowledgeSummary(data.summary);
      } else {
        // Use sample data if API is not available
        setKnowledgeSummary(sampleSummary);
      }
    } catch (error) {
      console.warn('Using sample data - API not available');
      setKnowledgeSummary(sampleSummary);
    }
  };

  const loadMemorySettings = async () => {
    try {
      const response = await fetch('/api/knowledge/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMemorySettings(data.settings);
      } else {
        // Use sample data if API is not available
        setMemorySettings(sampleSettings);
      }
    } catch (error) {
      console.warn('Using sample settings - API not available');
      setMemorySettings(sampleSettings);
    }
  };

  const extractKnowledge = async () => {
    if (!extractText.trim() || extractText.length < 10) {
      setError('Please enter at least 10 characters of text to extract knowledge from.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/knowledge/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text: extractText })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Successfully extracted ${data.knowledge.entity_count} entities and ${data.knowledge.fact_count} facts!`);
        setExtractText('');
        loadKnowledgeSummary(); // Refresh summary
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to extract knowledge');
      }
    } catch (error) {
      // Demo mode - simulate successful extraction
      setSuccess(`Demo: Extracted knowledge from text (${extractText.length} characters)`);
      setExtractText('');
    } finally {
      setLoading(false);
    }
  };

  const searchKnowledge = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/knowledge/search?q=${encodeURIComponent(searchQuery)}&limit=10`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to search knowledge base');
      }
    } catch (error) {
      // Demo mode - show sample results
      setSearchResults([
        {
          id: '1',
          content: 'John Smith is a software engineer at Google.',
          similarity: 0.85,
          entities: [{ type: 'person', value: 'John Smith' }],
          facts: [{ subject: 'John Smith', predicate: 'is', object: 'software engineer' }],
          created_at: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          content: 'Alice works on machine learning projects in San Francisco.',
          similarity: 0.72,
          entities: [{ type: 'person', value: 'Alice' }, { type: 'location', value: 'San Francisco' }],
          facts: [{ subject: 'Alice', predicate: 'works', object: 'machine learning projects' }],
          created_at: '2024-01-14T15:20:00Z'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateMemorySettings = async (newSettings) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/knowledge/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        const data = await response.json();
        setMemorySettings(data.settings);
        setSuccess('Settings updated successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update settings');
      }
    } catch (error) {
      // Demo mode - simulate successful update
      setMemorySettings({ ...memorySettings, ...newSettings });
      setSuccess('Demo: Settings updated successfully!');
    } finally {
      setLoading(false);
    }
  };

  const deleteMemories = async () => {
    if (!confirm('Are you sure you want to delete all your memories? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/knowledge/memories?confirm=true', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        setSuccess('All memories have been deleted.');
        loadKnowledgeSummary(); // Refresh summary
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete memories');
      }
    } catch (error) {
      // Demo mode
      setSuccess('Demo: Memories would be deleted in real application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Intelligent Knowledge Base</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="extract">Extract Knowledge</TabsTrigger>
          <TabsTrigger value="search">Search Memory</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="extract" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Extract Knowledge from Text
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter text to extract knowledge from (names, facts, relationships, etc.)..."
                value={extractText}
                onChange={(e) => setExtractText(e.target.value)}
                rows={6}
                className="w-full"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {extractText.length} characters
                </span>
                <Button 
                  onClick={extractKnowledge} 
                  disabled={loading || extractText.length < 10}
                >
                  {loading ? 'Extracting...' : 'Extract Knowledge'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Knowledge Base
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search for people, facts, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchKnowledge()}
                  className="flex-1"
                />
                <Button onClick={searchKnowledge} disabled={loading}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Search Results ({searchResults.length})</h3>
                  {searchResults.map((result) => (
                    <Card key={result.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline">
                          Similarity: {(result.similarity * 100).toFixed(1)}%
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(result.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{result.content}</p>
                      <div className="space-y-1">
                        {result.entities?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs font-medium">Entities:</span>
                            {result.entities.map((entity, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {entity.type}: {entity.value}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {result.facts?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs font-medium">Facts:</span>
                            {result.facts.map((fact, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {fact.subject} {fact.predicate} {fact.object}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Memories</p>
                    <p className="text-3xl font-bold">{knowledgeSummary?.total_memories || 0}</p>
                  </div>
                  <Database className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Entities</p>
                    <p className="text-3xl font-bold">{knowledgeSummary?.total_entities || 0}</p>
                  </div>
                  <Eye className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Facts</p>
                    <p className="text-3xl font-bold">{knowledgeSummary?.total_facts || 0}</p>
                  </div>
                  <Brain className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Entity Types</p>
                    <p className="text-3xl font-bold">
                      {knowledgeSummary?.entity_types ? Object.keys(knowledgeSummary.entity_types).length : 0}
                    </p>
                  </div>
                  <Settings className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {knowledgeSummary?.entity_types && (
            <Card>
              <CardHeader>
                <CardTitle>Entity Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(knowledgeSummary.entity_types).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="capitalize text-sm">{type}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Memory & Privacy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {memorySettings && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Memory Enabled</h4>
                      <p className="text-sm text-gray-600">Allow AI to remember conversations</p>
                    </div>
                    <Button
                      variant={memorySettings.memory_enabled ? "default" : "outline"}
                      onClick={() => updateMemorySettings({ memory_enabled: !memorySettings.memory_enabled })}
                    >
                      {memorySettings.memory_enabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Auto Extract Knowledge</h4>
                      <p className="text-sm text-gray-600">Automatically extract facts from conversations</p>
                    </div>
                    <Button
                      variant={memorySettings.auto_extract ? "default" : "outline"}
                      onClick={() => updateMemorySettings({ auto_extract: !memorySettings.auto_extract })}
                    >
                      {memorySettings.auto_extract ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Share Anonymized Data</h4>
                      <p className="text-sm text-gray-600">Help improve AI by sharing anonymized knowledge</p>
                    </div>
                    <Button
                      variant={memorySettings.share_anonymized ? "default" : "outline"}
                      onClick={() => updateMemorySettings({ share_anonymized: !memorySettings.share_anonymized })}
                    >
                      {memorySettings.share_anonymized ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-red-600 mb-2">Danger Zone</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium">Delete All Memories</h5>
                        <p className="text-sm text-gray-600">Permanently delete all stored knowledge</p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={deleteMemories}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}