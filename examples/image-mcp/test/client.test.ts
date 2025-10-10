// test/images.integration.test.ts
import '../src/index' // register the Worker with the test runtime

import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client} from '@modelcontextprotocol/sdk/client/index.js'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { WorkerSSEClientTransport } from '@nullshot/test-utils/mcp/WorkerSSEClientTransport'
import { ImageRecord } from '../src/repository'

describe('R2 Image Bucket MCP Client Integration Tests', () => {
  const baseUrl = 'http://localhost'
  let ctx: ExecutionContext
  let client: Client

  const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X5ZkAAAAASUVORK5CYII='

  const testImages = [
    { base64: pixel, name: 'sunset beach', description: 'Beautiful orange sunset over sandy beach' },
    { base64: pixel, name: 'mountain peak', description: 'Snow covered mountain peak at dawn' },
    { base64: pixel, name: 'forest trail', description: 'Winding dirt path through dense forest' },
    { base64: pixel, name: 'city skyline', description: 'Modern city buildings at night' },
    { base64: pixel, name: 'garden flowers', description: 'Colorful spring flowers in bloom' }
  ];

  function createTransport(ctx: ExecutionContext) {
    const url = new URL(`${baseUrl}/sse`);
    return new WorkerSSEClientTransport(url, ctx);
  }

  beforeAll(async () => {
    ctx = createExecutionContext()
    client = new Client({ name: 'it-client', version: '1.0.0' })
    await client.connect(new WorkerSSEClientTransport(new URL(`${baseUrl}/sse`), ctx))
  })

  afterAll(async () => {
    await client.close().catch(() => {})
    await waitOnExecutionContext(ctx)
  })

  // Test the flow: upload → retrieve → list. make sure the response result matches the expected result
  it('upload (base64) → retrieve → list', async () => {
    const up = await client.callTool({
      name: 'image_upload',
      arguments: { base64: pixel }
    }) as CallToolResult

    const upResult = JSON.parse(up.content[0].text as string) as ImageRecord
    expect(upResult.object.key).toBeTruthy()
    expect(String(upResult.object.content_type || '')).toMatch(/^image\//)
    
    expect(Number.isNaN(Date.parse(upResult.object.uploaded))).toBe(false)

    const retrieved = await client.callTool({
      name: 'image_retrieve',
      arguments: { id: upResult.id }
    }) as CallToolResult

    const retrievedResult = JSON.parse(retrieved.content[0].text as string) as ImageRecord
    expect(retrievedResult.object.key).toBe(upResult.object.key)
    expect(retrievedResult.object.size).toBe(upResult.object.size)
    expect(retrievedResult.object.content_type).toBe(upResult.object.content_type)
    expect(retrievedResult.object.uploaded).toBe(upResult.object.uploaded)
    expect(retrievedResult.object.base64).toBe(upResult.object.base64)

    const listed = await client.callTool({
      name: 'images_list',
      arguments: {}
    }) as CallToolResult
    const listResults = JSON.parse(listed.content[0].text as string) as ImageRecord[]
    
    expect(listResults.length).toEqual(1)
    // Check each object in the list matches the uploaded object
    for (const listResult of listResults) {
      expect(listResult.object.key).toBe(upResult.object.key)
      expect(listResult.object.size).toBe(upResult.object.size)
      expect(listResult.object.uploaded).toBe(upResult.object.uploaded)
    }
  })

  it('fails when missing base64', async () => {
    const result = await client.callTool({ name: 'image_upload', arguments: {} }) as CallToolResult
    
    expect(result.content).toBeInstanceOf(Array)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toBe('Must provide base64')
    expect(result.isError).toBe(true)
  })

  it('search for images', async () => {
    // Upload multiple test images with names and descriptions
    for (const img of testImages) {
      await client.callTool({
        name: 'image_upload',
        arguments: {
          base64: img.base64,
          name: img.name,
          description: img.description
        }
      });
    }

    // Test with empty query
    let result = await client.callTool({ name: 'images_search', arguments: { query: '' } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    const matches0 = JSON.parse(result.content[0].text as string) as ImageRecord[]
    expect(matches0.length).toBe(0)
    
    // Test exact match
    result = await client.callTool({ name: 'images_search', arguments: { query: 'sunset beach' } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    
    const matches1 = JSON.parse(result.content[0].text as string) as ImageRecord[]
    expect(matches1.length).toBe(1)
    expect(matches1[0].name).toBe('sunset beach')

    // Test partial word match
    result = await client.callTool({ name: 'images_search', arguments: { query: 'sun' } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    const matches2 = JSON.parse(result.content[0].text as string) as ImageRecord[]
    expect(matches2.length).toBe(1)
    expect(matches2[0].name).toBe('sunset beach')

    // Test description match
    result = await client.callTool({ name: 'images_search', arguments: { query: 'orange' } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    const matches3 = JSON.parse(result.content[0].text as string) as ImageRecord[]
    expect(matches3.length).toBe(1)
    expect(matches3[0].description).toContain('orange')

    // Test multiple results
    result = await client.callTool({ name: 'images_search', arguments: { query: 'in' } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    const matches4 = JSON.parse(result.content[0].text as string) as ImageRecord[]
    expect(matches4.length).toBeGreaterThan(1) // Should match "in" in multiple descriptions

    // Test limit
    result = await client.callTool({ name: 'images_search', arguments: { query: 'in', limit: 2 } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    const matches5 = JSON.parse(result.content[0].text as string) as ImageRecord[]
    expect(matches5.length).toBe(2)
  })

  it('list image with limit and offset', async () => {
    // Create a bunch of test data
    for (const img of testImages) {
      await client.callTool({
        name: 'image_upload',
        arguments: {
          base64: img.base64,
          name: img.name,
          description: img.description
        }
      });
    }

    // Test listing images with limit
    let result = await client.callTool({ name: 'images_list', arguments: { limit: 2 } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    let listed = JSON.parse(result.content[0].text as string) as ImageRecord[]
    expect(listed.length).toBe(2)

    // Test listing images with offset
    result = await client.callTool({ name: 'images_list', arguments: { limit: 2, offset: 1 } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    let listedOffset = JSON.parse(result.content[0].text as string) as ImageRecord[]
    // Should be total images minus 1
    expect(listedOffset.length).toBeGreaterThan(0)
    expect(listedOffset.length).toBeLessThanOrEqual(listed.length + 1)

    // Test listing images with limit and offset
    result = await client.callTool({ name: 'images_list', arguments: { limit: 1, offset: 1 } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    let listedLimitOffset = JSON.parse(result.content[0].text as string) as ImageRecord[]
    expect(listedLimitOffset.length).toBe(1)

    // Optionally, check that the offset works as expected
    // Get all images for comparison
    result = await client.callTool({ name: 'images_list', arguments: {} }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    let allImages = JSON.parse(result.content[0].text as string) as ImageRecord[]
    if (allImages.length > 1) {
      expect(listedOffset[0].name).toBe(allImages[1].name)
      expect(listedLimitOffset[0].name).toBe(allImages[1].name)
    }
  })

  it('search images with limit and offset', async () => {
    // Create a bunch of test data (if not already present)
    for (const img of testImages) {
      await client.callTool({
        name: 'image_upload',
        arguments: {
          base64: img.base64,
          name: img.name,
          description: img.description
        }
      });
    }

    // Search with limit
    let result = await client.callTool({ name: 'images_search', arguments: { query: 'in', limit: 2 } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    let searchLimited = JSON.parse(result.content[0].text as string) as ImageRecord[]
    expect(searchLimited.length).toBe(2)

    // Search with limit and offset
    result = await client.callTool({ name: 'images_search', arguments: { query: 'in', limit: 1, offset: 1 } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    let searchLimitOffset = JSON.parse(result.content[0].text as string) as ImageRecord[]
    expect(searchLimitOffset.length).toBe(1)

    // Optionally, check that the offset works as expected
    // Get all search results for comparison
    result = await client.callTool({ name: 'images_search', arguments: { query: '' } }) as CallToolResult
    expect(result.content[0].type).toBe('text')
    let allSearchResults = JSON.parse(result.content[0].text as string) as ImageRecord[]
    if (allSearchResults.length > 1) {
      expect(searchLimitOffset[0].name).toBe(allSearchResults[1].name)
    }
  })
})
