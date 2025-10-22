import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ImageRepository } from './repository'

export function setupServerTools(server: McpServer, repository: ImageRepository) {

  // 1) List objects in the bucket (supports prefix, pagination)
  server.tool(
    "images_list",
    "List images in the configured object store",
    {
      limit: z.number().optional().describe("Limit the number of results"),
      offset: z.number().optional().describe("Offset the number of results")
    },
    async ({ limit, offset }) => {
      const out = await repository.all(limit, offset)
      return {
        content: [
          { type: "text", text: JSON.stringify(out, null, 2) }
        ]
      }
    }
  )
   
  // 2) Store (upload) an image from base64
  server.tool(
    "image_upload",
    "Upload an image (base64 format) to the configured object store.",
    {
      base64: z.string().optional().describe("Raw base64 or data:*;base64,..."),
      name: z.string().optional().describe("Image name"),
      description: z.string().optional().describe("Image description"),
    },
    async ({ base64, name, description }) => {
      if (!base64) throw new Error("Must provide base64") 

      const out = await repository.put(base64, name, description)
      return {
        content: [
          { type: "text", text: JSON.stringify(out, null, 2) }
        ]
      }
    }
  )

  // 3) Read (get) an image as base64
  server.tool(
    "image_retrieve",
    "Retrieve an image from configured object store and return as base64",
    { id: z.string().describe("ID of the image to retrieve") },
    async ({ id }) => {
      const out = await repository.get(id)
      return {
        content: [
          { type: "text", text: JSON.stringify(out, null, 2) }
        ]
      }
    }
  )

  // 4) Search for images
  server.tool(
    "images_search",
    "Search for images in the configured object store",
    {
      query: z.string().describe("Search query"),
      limit: z.number().optional().describe("Limit the number of results"),
      offset: z.number().optional().describe("Offset the number of results")
    },
    async ({ query, limit, offset }) => {
      const out = await repository.search(query, limit, offset)
      return {
        content: [
          { type: "text", text: JSON.stringify(out, null, 2) }
        ]
      }
    }
  )
} 