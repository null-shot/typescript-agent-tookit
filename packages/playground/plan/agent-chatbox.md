# Agent Chatbox Implementation Plan

## Overview
We are building a chat interface in the playground application using shadcn/ui, Tailwind CSS v4 with CSS variables for theming, and the Vercel AI SDK UI for streaming responses. The chat interface will feature chat bubbles that contain text and timestamps, with two different themes: green for agent messages and gray for user messages. We'll import images and CSS from Figma using the Figma MCP (Model Context Protocol).

## Steps

### 1. Setup and Configuration (Completed)
- [x] Install shadcn/ui
- [x] Configure for Tailwind CSS v4
- [x] Setup CSS variables for theming

### 2. Component Structure (Completed)
- [x] Create a ChatContainer component
  - This will hold the entire chat interface
- [x] Create a ChatMessage component
  - This will be responsible for rendering individual messages
  - It will support two variants: user and agent
- [x] Create a ChatInput component
  - For users to type and send messages

### 3. Styling (Completed)
- [x] Define CSS variables for the chat themes
  - Green theme for agent messages
  - Gray theme for user messages
- [x] Style the chat bubbles with rounded corners
- [x] Add appropriate spacing and alignment
  - User messages aligned to the right
  - Agent messages aligned to the left

### 4. Figma Integration (Completed)
- [x] Extract UI elements from Figma using Figma MCP
  - Avatar images
  - Icons
  - Exact color values
  - Typography details
- [x] Implement exact styling from Figma design

### 5. Functionality (Completed)
- [x] Implement message display logic
- [x] Add timestamp formatting
- [x] Create message send functionality

### 6. Enhanced Chat Features (Completed)
- [x] Add a chat header/top bar based on Figma design
  - [x] Implement title component with "Chat with Vista" text
  - [x] Add edit button with square-pen icon
  - [x] Add menu button with ellipsis-vertical icon
  - [x] Implement dropdown menu for the ellipsis button with options:
    - [x] Search
    - [x] Chat Logs
    - [x] Share Chat
- [x] Create a date divider component
  - [x] Display date in the format "Day, DD Mon YYYY"
  - [x] Show divider when messages transition to a new day
  - [x] Center the date divider between messages
- [x] Smart date handling
  - [x] Process message list to automatically insert date dividers when day changes
  - [x] Group messages by date for better organization

### 7. AI SDK Integration (In Progress)
- [x] Install Vercel AI SDK UI package
  ```bash
  npm install ai
  ```
- [x] Implement message streaming using AI SDK
  - [x] Create useChat hook with proper configuration
  - [x] Connect to localhost:8787/agent/chat endpoint
  - [x] Extract session ID from X-Session-Id header
  - [x] Update router with session ID for persistence
- [x] Create animated "thinking" state
  - [x] Show agent icon with empty chat bubble during "thinking" state
  - [x] Add animation to indicate processing (pulsing border or typing indicator)
  - [x] Animate chat box appearance when text starts streaming
  - [x] Implement typing animation for text streaming

### 8. ChatContainer Refactoring (In Progress)
- [x] Convert ChatContainer to use AI SDK internally
  - [x] Make ChatContainer configurable with or without SDK
  - [x] Create a parameter to enable/disable AI SDK integration
  - [x] Implement proper message handling and streaming
- [x] Hook up handleInputChange/handleSendMessage for input box
  - [x] Connect to AI SDK's message submission
  - [x] Handle loading states properly
  - [x] Implement error handling for failed requests

### 9. Session Management (Completed)
- [x] Implement session persistence
  - [x] Extract session ID from server response headers
  - [x] Update browser URL to include session ID
  - [x] Load existing session when session ID is present in URL
  - [ ] Implement local storage fallback for session data (Optional)

### 10. Accessibility (Pending)
- [ ] Ensure proper contrast ratios
- [ ] Add appropriate ARIA labels
- [ ] Test keyboard navigation
- [ ] Add screen reader support for streaming text

## Implementation Details

### Component Hierarchy
```
ChatContainer
├── ChatHeader (Top bar with title and buttons)
├── ChatMessageList
│   ├── DateDivider (Appears when day changes)
│   ├── User messages (gray theme)
│   └── Agent messages (green theme with thinking animation)
└── ChatInput (Connected to AI SDK)
```

### CSS Variables
We've added the following custom CSS variables to our theme:
- `--chat-user-bg`: Background color for user messages (dark gray)
- `--chat-user-text`: Text color for user messages (white with opacity)
- `--chat-agent-bg`: Background gradient for agent messages (teal gradient)
- `--chat-agent-text`: Text color for agent messages (white with opacity)
- `--chat-timestamp`: Color for timestamp text (white with opacity)
- `--chat-date-divider-bg`: Background color for date divider (#17181A)
- `--chat-date-divider-border`: Border gradient for date divider
- `--chat-header-bg`: Background color for the chat header (#151515)
- `--chat-header-border`: Border color for the chat header (rgba(255, 255, 255, 0.12))

### Added CSS for Animation
New CSS variables and animations for the thinking state:
- `--chat-thinking-animation`: Animation for the thinking state (pulsing or typing indicator)
- `--chat-thinking-duration`: Duration for thinking animation
- `--chat-text-animation`: Animation for text streaming

### AI SDK Integration
We've implemented the Vercel AI SDK's `useChat` hook for message handling and streaming:
```jsx
// Inside the ChatContainer component
const {
  messages: aiMessages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  error
} = useChat({
  api: apiUrl,
  onResponse: (response) => {
    // Extract session ID from headers and update URL
    const sessionId = response.headers.get('X-Session-Id');
    if (sessionId) {
      router.push(`/agent/chat/${sessionId}`);
    }
  }
});
```

We've also:
- Added support for "thinking" state during message loading
- Implemented smooth animations for message streaming
- Created dynamic routes for session management
- Made the ChatContainer configurable to work with or without the AI SDK

### Next Steps
1. ✅ Create the basic component structure
2. ✅ Extract design elements from Figma
3. ✅ Implement styling with CSS variables
4. ✅ Add message functionality
5. ✅ Implement chat header with buttons
6. ✅ Create date divider component
7. ✅ Add smart date handling for message groups
8. ✅ Install and integrate Vercel AI SDK
9. ✅ Implement the "thinking" state animation
10. ✅ Refactor ChatContainer to use AI SDK
11. ✅ Implement session management with URL updates
12. Test and refine the implementation
13. Focus on accessibility improvements

## Summary of Implementation
We're enhancing our chat interface to use the Vercel AI SDK for streaming responses and adding animated states for improved user experience. The enhancements include:

1. ✅ Integration with Vercel AI SDK for real-time message streaming
2. ✅ An animated "thinking" state that shows when the agent is processing
3. ✅ Typing animation for text as it streams in
4. ✅ Session persistence through URL parameters
5. ✅ Refactoring the ChatContainer to be more configurable
6. ✅ Improved error handling for failed requests
7. Accessibility enhancements for the streaming text 