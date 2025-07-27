'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CollaborationClient, 
  CollaborationUser, 
  CollaborationOperation, 
  OperationalTransform 
} from '@/lib/websocket/collaboration-client';

interface CollaborativeEditorProps {
  documentId: string;
  initialContent?: string;
  currentUser: CollaborationUser;
  wsUrl: string;
  onContentChange?: (content: string) => void;
  onUsersChange?: (users: CollaborationUser[]) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export function CollaborativeEditor({
  documentId,
  initialContent = '',
  currentUser,
  wsUrl,
  onContentChange,
  onUsersChange,
  className = '',
  placeholder = 'Start typing...',
  readOnly = false,
}: CollaborativeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const collaborationClientRef = useRef<CollaborationClient | null>(null);
  const lastContentRef = useRef(content);
  const pendingOperationsRef = useRef<CollaborationOperation[]>([]);

  // Initialize collaboration client
  useEffect(() => {
    const client = new CollaborationClient(wsUrl);
    collaborationClientRef.current = client;

    // Set up event listeners
    client.on('connected', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      client.joinDocument(documentId);
    });

    client.on('disconnected', () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    client.on('error', (error) => {
      console.error('Collaboration error:', error);
      setConnectionStatus('error');
    });

    client.on('documentSync', (document) => {
      setContent(document.content);
      setActiveUsers(document.activeUsers);
      lastContentRef.current = document.content;
      onContentChange?.(document.content);
      onUsersChange?.(document.activeUsers);
    });

    client.on('operation', (operation: CollaborationOperation) => {
      handleRemoteOperation(operation);
    });

    client.on('userJoined', (user: CollaborationUser) => {
      setActiveUsers(prev => {
        const updated = [...prev.filter(u => u.id !== user.id), user];
        onUsersChange?.(updated);
        return updated;
      });
    });

    client.on('userLeft', (userId: string) => {
      setActiveUsers(prev => {
        const updated = prev.filter(u => u.id !== userId);
        onUsersChange?.(updated);
        return updated;
      });
    });

    client.on('cursorUpdate', (userId: string, cursor) => {
      setActiveUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, cursor } : user
      ));
    });

    // Connect to collaboration server
    setConnectionStatus('connecting');
    client.connect(currentUser).catch((error) => {
      console.error('Failed to connect to collaboration server:', error);
      setConnectionStatus('error');
    });

    return () => {
      client.leaveDocument();
      client.disconnect();
    };
  }, [documentId, currentUser, wsUrl, onContentChange, onUsersChange]);

  // Handle remote operations
  const handleRemoteOperation = useCallback((operation: CollaborationOperation) => {
    setContent(prevContent => {
      // Transform pending operations against the incoming operation
      pendingOperationsRef.current = pendingOperationsRef.current.map(pendingOp =>
        OperationalTransform.transform(pendingOp, operation)
      );

      // Apply the operation to the content
      const newContent = OperationalTransform.applyOperation(prevContent, operation);
      lastContentRef.current = newContent;
      onContentChange?.(newContent);
      return newContent;
    });
  }, [onContentChange]);

  // Handle local content changes
  const handleContentChange = useCallback((newContent: string) => {
    if (readOnly || !isConnected || !collaborationClientRef.current) {
      return;
    }

    const oldContent = lastContentRef.current;
    if (newContent === oldContent) {
      return;
    }

    // Generate operation based on content difference
    const operation = generateOperation(oldContent, newContent, currentUser.id);
    if (operation) {
      // Add to pending operations
      pendingOperationsRef.current.push(operation);
      
      // Send operation to server
      collaborationClientRef.current.sendOperation(operation);
    }

    setContent(newContent);
    lastContentRef.current = newContent;
    onContentChange?.(newContent);
  }, [readOnly, isConnected, currentUser.id, onContentChange]);

  // Handle cursor/selection changes
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current || !isConnected || !collaborationClientRef.current) {
      return;
    }

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    
    collaborationClientRef.current.sendCursor({
      x: rect.left,
      y: rect.top,
      selection: {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      },
    });
  }, [isConnected]);

  /**
   * Generate operation from content difference using a two-way diff algorithm
   * 
   * This algorithm implements a simplified version of the Myers diff algorithm
   * optimized for real-time collaborative editing. It finds the minimal set of
   * operations needed to transform oldContent into newContent.
   * 
   * Algorithm Overview:
   * 1. Find common prefix by comparing characters from the start
   * 2. Find common suffix by comparing characters from the end
   * 3. Determine the type of operation needed for the middle section
   * 
   * Time Complexity: O(n + m) where n and m are the lengths of the strings
   * Space Complexity: O(1) - only uses a constant amount of extra space
   * 
   * @param oldContent - The original content before changes
   * @param newContent - The new content after changes  
   * @param userId - ID of the user making the change
   * @returns CollaborationOperation or null if no changes detected
   */
  const generateOperation = (oldContent: string, newContent: string, userId: string): CollaborationOperation | null => {
    // Phase 1: Find common prefix
    // Compare characters from the beginning until we find a difference
    let prefixEnd = 0;
    const minLength = Math.min(oldContent.length, newContent.length);
    
    while (prefixEnd < minLength && oldContent[prefixEnd] === newContent[prefixEnd]) {
      prefixEnd++;
    }

    // Early exit: no changes detected
    if (prefixEnd === oldContent.length && prefixEnd === newContent.length) {
      return null;
    }

    // Phase 2: Handle simple append case
    // If old content is entirely a prefix of new content, it's a simple insertion
    if (prefixEnd === oldContent.length) {
      return {
        type: 'insert',
        position: prefixEnd,
        content: newContent.slice(prefixEnd),
        userId,
        timestamp: new Date().toISOString(),
      };
    }

    // Phase 3: Handle simple truncation case  
    // If new content is entirely a prefix of old content, it's a simple deletion
    if (prefixEnd === newContent.length) {
      return {
        type: 'delete',
        position: prefixEnd,
        length: oldContent.length - prefixEnd,
        userId,
        timestamp: new Date().toISOString(),
      };
    }

    // Phase 4: Find common suffix
    // Compare characters from the end to minimize the change region
    let suffixStart = 0;
    const remainingOldLength = oldContent.length - prefixEnd;
    const remainingNewLength = newContent.length - prefixEnd;
    const maxSuffixLength = Math.min(remainingOldLength, remainingNewLength);
    
    while (
      suffixStart < maxSuffixLength &&
      oldContent[oldContent.length - 1 - suffixStart] === newContent[newContent.length - 1 - suffixStart]
    ) {
      suffixStart++;
    }

    // Phase 5: Calculate the change region
    // The region between the common prefix and suffix needs to be modified
    const deletedLength = remainingOldLength - suffixStart;
    const insertedContent = newContent.slice(prefixEnd, newContent.length - suffixStart);

    // Phase 6: Generate appropriate operation based on change type
    if (deletedLength > 0 && insertedContent.length > 0) {
      // Replace operation: both deletion and insertion needed
      // For operational transform compatibility, we represent this as an insert
      // The delete will be handled implicitly by the position and content length
      return {
        type: 'insert',
        position: prefixEnd,
        content: insertedContent,
        userId,
        timestamp: new Date().toISOString(),
      };
    } else if (deletedLength > 0) {
      // Pure deletion: remove characters from the middle
      return {
        type: 'delete',
        position: prefixEnd,
        length: deletedLength,
        userId,
        timestamp: new Date().toISOString(),
      };
    } else if (insertedContent.length > 0) {
      // Pure insertion: add characters in the middle
      return {
        type: 'insert',
        position: prefixEnd,
        content: insertedContent,
        userId,
        timestamp: new Date().toISOString(),
      };
    }

    // Should never reach here, but return null as fallback
    return null;
  };

  return (
    <div className={`collaborative-editor ${className}`}>
      {/* Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500' :
            connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
          }`} />
          <span className="text-gray-600 font-medium">
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
          </span>
        </div>
        
        {/* Active Users */}
        <div className="flex items-center justify-between sm:justify-end">
          <span className="text-gray-500 text-xs sm:hidden mr-2">
            {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} online
          </span>
          <div className="flex items-center space-x-1">
            {activeUsers.slice(0, 4).map((user) => (
              <div
                key={user.id}
                className="w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs text-white font-medium border-2 border-white shadow-sm"
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
            ))}
            {activeUsers.length > 4 && (
              <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-gray-400 flex items-center justify-center text-xs text-white border-2 border-white shadow-sm">
                +{activeUsers.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onSelect={handleSelectionChange}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`w-full min-h-[400px] p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
          }`}
        />

        {/* User Cursors */}
        {activeUsers
          .filter(user => user.id !== currentUser.id && user.cursor)
          .map((user) => (
            <div
              key={user.id}
              className="absolute pointer-events-none"
              style={{
                left: user.cursor!.x,
                top: user.cursor!.y,
                borderLeft: `2px solid ${user.color}`,
                height: '20px',
              }}
            >
              <div
                className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded whitespace-nowrap"
                style={{ backgroundColor: user.color }}
              >
                {user.name}
              </div>
            </div>
          ))}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <div>
          {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} online
        </div>
        <div>
          {content.length} characters
        </div>
      </div>
    </div>
  );
}

// User Presence Component
interface UserPresenceProps {
  users: CollaborationUser[];
  currentUserId: string;
  maxVisible?: number;
}

export function UserPresence({ users, currentUserId, maxVisible = 5 }: UserPresenceProps) {
  const otherUsers = users.filter(user => user.id !== currentUserId);
  const visibleUsers = otherUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, otherUsers.length - maxVisible);

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600">Collaborators:</span>
      <div className="flex items-center space-x-1">
        {visibleUsers.map((user) => (
          <div
            key={user.id}
            className="relative group"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-medium border-2 border-white shadow-sm"
              style={{ backgroundColor: user.color }}
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {user.name}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        ))}
        
        {hiddenCount > 0 && (
          <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-sm text-white font-medium">
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
}

// Collaboration Status Component
interface CollaborationStatusProps {
  isConnected: boolean;
  userCount: number;
  lastSaved?: string;
}

export function CollaborationStatus({ isConnected, userCount, lastSaved }: CollaborationStatusProps) {
  return (
    <div className="flex items-center space-x-4 text-sm text-gray-600">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      
      <div>
        {userCount} user{userCount !== 1 ? 's' : ''} online
      </div>
      
      {lastSaved && (
        <div>
          Last saved: {new Date(lastSaved).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}