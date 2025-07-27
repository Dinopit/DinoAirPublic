import type { Meta, StoryObj } from '@storybook/react';
import { CollaborativeEditor, UserPresence, CollaborationStatus } from './collaborative-editor';
import { CollaborationUser } from '@/lib/websocket/collaboration-client';

// Mock WebSocket URL for Storybook
const mockWsUrl = 'ws://localhost:3001/collaboration';

// Sample users for collaboration
const sampleUsers: CollaborationUser[] = [
  {
    id: 'user1',
    name: 'Alice Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face',
    color: '#3b82f6',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'user2',
    name: 'Bob Smith',
    color: '#ef4444',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'user3',
    name: 'Carol Davis',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face',
    color: '#10b981',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'user4',
    name: 'David Wilson',
    color: '#f59e0b',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'user5',
    name: 'Eva Martinez',
    color: '#8b5cf6',
    lastSeen: new Date().toISOString(),
  },
];

const currentUser: CollaborationUser = {
  id: 'current-user',
  name: 'You',
  color: '#06b6d4',
  lastSeen: new Date().toISOString(),
};

const sampleContent = `# DinoAir Collaboration Document

Welcome to the collaborative editing experience! This document demonstrates real-time collaboration features.

## Features

- **Real-time editing**: See changes from other users instantly
- **User presence**: View who's currently editing
- **Cursor tracking**: See where other users are working
- **Conflict resolution**: Automatic operational transform handling

## Getting Started

1. Start typing to see your changes
2. Other users' changes will appear in real-time
3. User cursors show where others are editing
4. The system handles conflicts automatically

## Code Example

\`\`\`javascript
function collaborativeEdit(content, operation) {
  // Apply operational transform
  const transformed = transform(operation, pendingOps);
  return applyOperation(content, transformed);
}
\`\`\`

Feel free to edit this document and experiment with the collaboration features!`;

const meta: Meta<typeof CollaborativeEditor> = {
  title: 'UI/CollaborativeEditor',
  component: CollaborativeEditor,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A real-time collaborative editor that supports multiple users editing the same document simultaneously. Features operational transform for conflict resolution, user presence indicators, and cursor tracking.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    documentId: {
      control: 'text',
      description: 'Unique identifier for the document being edited',
    },
    initialContent: {
      control: 'text',
      description: 'Initial content of the document',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the editor',
    },
    readOnly: {
      control: 'boolean',
      description: 'Whether the editor is read-only',
    },
    wsUrl: {
      control: 'text',
      description: 'WebSocket URL for collaboration server',
    },
    onContentChange: {
      action: 'content-changed',
      description: 'Callback when content changes',
    },
    onUsersChange: {
      action: 'users-changed',
      description: 'Callback when active users change',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    documentId: 'doc-1',
    initialContent: sampleContent,
    currentUser: currentUser,
    wsUrl: mockWsUrl,
    placeholder: 'Start typing to collaborate...',
    readOnly: false,
    onContentChange: (content) => console.log('Content changed:', content.length, 'characters'),
    onUsersChange: (users) => console.log('Active users:', users.length),
  },
};

export const ReadOnlyMode: Story = {
  args: {
    documentId: 'doc-readonly',
    initialContent: sampleContent,
    currentUser: currentUser,
    wsUrl: mockWsUrl,
    placeholder: 'This document is read-only',
    readOnly: true,
    onContentChange: (content) => console.log('Content changed:', content.length, 'characters'),
    onUsersChange: (users) => console.log('Active users:', users.length),
  },
  parameters: {
    docs: {
      description: {
        story: 'The editor in read-only mode where users can view but not edit the content.',
      },
    },
  },
};

export const EmptyDocument: Story = {
  args: {
    documentId: 'doc-empty',
    initialContent: '',
    currentUser: currentUser,
    wsUrl: mockWsUrl,
    placeholder: 'Start writing your collaborative document...',
    readOnly: false,
    onContentChange: (content) => console.log('Content changed:', content.length, 'characters'),
    onUsersChange: (users) => console.log('Active users:', users.length),
  },
  parameters: {
    docs: {
      description: {
        story: 'An empty document ready for collaborative editing.',
      },
    },
  },
};

export const WithManyUsers: Story = {
  args: {
    documentId: 'doc-busy',
    initialContent: sampleContent,
    currentUser: currentUser,
    wsUrl: mockWsUrl,
    placeholder: 'Collaborating with many users...',
    readOnly: false,
    onContentChange: (content) => console.log('Content changed:', content.length, 'characters'),
    onUsersChange: (users) => console.log('Active users:', users.length),
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the editor with multiple active collaborators.',
      },
    },
  },
};

export const MobileView: Story = {
  args: {
    documentId: 'doc-mobile',
    initialContent: sampleContent,
    currentUser: currentUser,
    wsUrl: mockWsUrl,
    placeholder: 'Mobile collaborative editing...',
    readOnly: false,
    onContentChange: (content) => console.log('Content changed:', content.length, 'characters'),
    onUsersChange: (users) => console.log('Active users:', users.length),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'The collaborative editor optimized for mobile devices.',
      },
    },
  },
};

export const DarkTheme: Story = {
  args: {
    documentId: 'doc-dark',
    initialContent: sampleContent,
    currentUser: currentUser,
    wsUrl: mockWsUrl,
    placeholder: 'Dark theme collaboration...',
    readOnly: false,
    onContentChange: (content) => console.log('Content changed:', content.length, 'characters'),
    onUsersChange: (users) => console.log('Active users:', users.length),
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'The collaborative editor in dark theme mode.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="dark">
        <Story />
      </div>
    ),
  ],
};

// Standalone User Presence Component Stories
export const UserPresenceComponent: StoryObj<typeof UserPresence> = {
  render: (args) => <UserPresence {...args} />,
  args: {
    users: sampleUsers,
    currentUserId: currentUser.id,
    maxVisible: 5,
  },
  parameters: {
    docs: {
      description: {
        story: 'Standalone user presence component showing active collaborators.',
      },
    },
  },
};

export const UserPresenceFewUsers: StoryObj<typeof UserPresence> = {
  render: (args) => <UserPresence {...args} />,
  args: {
    users: sampleUsers.slice(0, 2),
    currentUserId: currentUser.id,
    maxVisible: 5,
  },
  parameters: {
    docs: {
      description: {
        story: 'User presence with only a few active users.',
      },
    },
  },
};

export const UserPresenceManyUsers: StoryObj<typeof UserPresence> = {
  render: (args) => <UserPresence {...args} />,
  args: {
    users: [...sampleUsers, ...sampleUsers.map((u, i) => ({ ...u, id: `${u.id}-${i}`, name: `${u.name} ${i}` }))],
    currentUserId: currentUser.id,
    maxVisible: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'User presence with many users, showing overflow indicator.',
      },
    },
  },
};

// Standalone Collaboration Status Component Stories
export const CollaborationStatusComponent: StoryObj<typeof CollaborationStatus> = {
  render: (args) => <CollaborationStatus {...args} />,
  args: {
    isConnected: true,
    userCount: 4,
    lastSaved: new Date().toISOString(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Standalone collaboration status component showing connection and user info.',
      },
    },
  },
};

export const CollaborationStatusDisconnected: StoryObj<typeof CollaborationStatus> = {
  render: (args) => <CollaborationStatus {...args} />,
  args: {
    isConnected: false,
    userCount: 0,
    lastSaved: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
  },
  parameters: {
    docs: {
      description: {
        story: 'Collaboration status when disconnected from the server.',
      },
    },
  },
};

export const CollaborationStatusSingleUser: StoryObj<typeof CollaborationStatus> = {
  render: (args) => <CollaborationStatus {...args} />,
  args: {
    isConnected: true,
    userCount: 1,
    lastSaved: new Date().toISOString(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Collaboration status with only one user online.',
      },
    },
  },
};

// Interactive demo story
export const InteractiveDemo: Story = {
  args: {
    documentId: 'doc-demo',
    initialContent: `# Interactive Collaboration Demo

Try editing this document! In a real application, you would see:

- Other users' changes appearing in real-time
- User cursors showing where others are typing
- Automatic conflict resolution
- Live user presence indicators

## Features to Try

1. **Type anywhere** - Your changes are tracked
2. **Select text** - Selection is shared with others
3. **Watch the user count** - See collaboration status
4. **Check responsiveness** - Works on mobile too

Start typing to see the collaboration features in action!`,
    currentUser: currentUser,
    wsUrl: mockWsUrl,
    placeholder: 'Start collaborating...',
    readOnly: false,
    onContentChange: (content) => console.log('Content changed:', content.length, 'characters'),
    onUsersChange: (users) => console.log('Active users:', users.length),
  },
  parameters: {
    docs: {
      description: {
        story: 'An interactive demo of the collaborative editor. Try typing and see how the component responds to changes.',
      },
    },
  },
};