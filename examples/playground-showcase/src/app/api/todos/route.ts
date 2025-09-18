import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Listing todos from CRUD MCP server');
    
    // Get a session ID from the CRUD MCP server (with timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const sessionResponse = await fetch('http://localhost:8788/sse', {
      signal: controller.signal
    });
    
    // Read only the first chunk to get the session ID
    const reader = sessionResponse.body?.getReader();
    const { value } = await reader?.read() || {};
    clearTimeout(timeoutId);
    reader?.cancel();
    
    const sessionText = new TextDecoder().decode(value);
    const sessionMatch = sessionText.match(/sessionId=([a-f0-9]+)/);
    const sessionId = sessionMatch ? sessionMatch[1] : null;
    
    if (!sessionId) {
      throw new Error('Could not get session ID from CRUD MCP server');
    }
    
    console.log(`📝 Using session ID: ${sessionId}`);
    
    // Call the list todos resource
    const response = await fetch(`http://localhost:8788/sse/message?sessionId=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Math.random().toString(36),
        method: 'resources/read',
        params: {
          uri: 'todo://all'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ CRUD MCP server todos response:', result);
    
    return NextResponse.json({
      success: true,
      todos: result.result || result,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('❌ Error listing todos:', error);
    return NextResponse.json(
      { error: `Failed to list todos: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, status = 'not_started', due_date } = body;
    
    console.log(`🔧 Creating todo: ${title}`);
    
    // Get a session ID from the CRUD MCP server (with timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const sessionResponse = await fetch('http://localhost:8788/sse', {
      signal: controller.signal
    });
    
    // Read only the first chunk to get the session ID
    const reader = sessionResponse.body?.getReader();
    const { value } = await reader?.read() || {};
    clearTimeout(timeoutId);
    reader?.cancel();
    
    const sessionText = new TextDecoder().decode(value);
    const sessionMatch = sessionText.match(/sessionId=([a-f0-9]+)/);
    const sessionId = sessionMatch ? sessionMatch[1] : null;
    
    if (!sessionId) {
      throw new Error('Could not get session ID from CRUD MCP server');
    }
    
    console.log(`📝 Using session ID: ${sessionId}`);
    
    // Call the create todo tool
    const response = await fetch(`http://localhost:8788/sse/message?sessionId=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Math.random().toString(36),
        method: 'tools/call',
        params: {
          name: 'create_todo',
          arguments: { title, description, status, due_date }
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ CRUD MCP server create response:', result);
    
    return NextResponse.json({
      success: true,
      todo: result.result || result,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('❌ Error creating todo:', error);
    return NextResponse.json(
      { error: `Failed to create todo: ${error}` },
      { status: 500 }
    );
  }
}
