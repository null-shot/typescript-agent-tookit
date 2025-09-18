"use client";

import { useEffect, useState } from 'react';

export default function SimpleChatPage() {
  const [messages, setMessages] = useState([
    { type: 'system', content: 'Welcome! I\'m your AI assistant. I can help you manage tasks and answer questions.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  const sessionId = 'session-' + Math.random().toString(36).substr(2, 9);

  useEffect(() => {
    checkAgentStatus();
  }, []);

  const checkAgentStatus = async () => {
    try {
      const response = await fetch('http://localhost:8787/agent/chat/status-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'status-check',
          messages: [{ role: 'user', content: 'ping' }]
        })
      });

      if (response.ok) {
        setConnectionStatus('Connected');
      } else {
        throw new Error('Agent not responding');
      }
    } catch (error) {
      setConnectionStatus('Disconnected');
      setMessages(prev => [...prev, {
        type: 'system',
        content: '⚠️ Agent is not available. Please check that the server is running on port 8787.'
      }]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { type: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const loadingMessage = { type: 'assistant', content: 'AI is thinking...' };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const response = await fetch(`http://localhost:8787/agent/chat/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'msg-' + Date.now(),
          messages: [{ role: 'user', content: input }]
        })
      });

      // Remove loading message
      setMessages(prev => prev.slice(0, -1));

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('API key is missing or invalid. Please check your Anthropic API key configuration.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';

      if (reader) {
        const responseMessage = { type: 'assistant', content: '' };
        setMessages(prev => [...prev, responseMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantResponse += chunk;

          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              type: 'assistant',
              content: assistantResponse
            };
            return newMessages;
          });
        }
      }

      setConnectionStatus('Connected');
    } catch (error) {
      setMessages(prev => prev.slice(0, -1)); // Remove loading message
      setMessages(prev => [...prev, {
        type: 'error',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`
      }]);
      setConnectionStatus('Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Status Indicator */}
      <div className={`fixed top-4 right-4 px-3 py-1 rounded text-sm font-medium ${
        connectionStatus === 'Connected' ? 'bg-green-900 text-green-200' :
        connectionStatus === 'Disconnected' ? 'bg-red-900 text-red-200' :
        'bg-yellow-900 text-yellow-200'
      }`}>
        {connectionStatus}
      </div>

      <div className="max-w-4xl mx-auto p-4 h-screen flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 rounded-t-lg p-4 border-b border-gray-700">
          <h1 className="text-lg font-semibold">Simple Chat - AI Agent</h1>
        </div>

        {/* Messages Container */}
        <div className="flex-1 bg-gray-800 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg max-w-[85%] ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white ml-auto text-right'
                    : message.type === 'system'
                    ? 'bg-gray-700 text-green-300 mx-auto text-center italic text-sm'
                    : message.type === 'error'
                    ? 'bg-red-900 text-red-200 border-l-4 border-red-500'
                    : 'bg-gray-700 text-white mr-auto'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Input Container */}
        <div className="bg-gray-800 rounded-b-lg p-4 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              disabled={isLoading}
              className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
