// Lightweight wrapper around a Cloudflare R2 bucket for image operations.

// @ts-ignore
import crypto from 'node:crypto'

export type ImageObject = {
  key: string
  size: number
  uploaded: string
  content_type: string
  base64?: string
}

export class R2ImageBucket {
  constructor(private bucket: R2Bucket) {}

  async list(opts: R2ListOptions = {}) {
    const res = await this.bucket.list(opts)
    
    return {
      objects: res.objects.map(o => ({
        key: o.key,
        size: o.size,
        uploaded: o.uploaded,
        // based64: too long to be displayed in the UI so don't include it for now
      })),
      delimitedPrefixes: res.delimitedPrefixes,
      cursor: res?.truncated ? res.cursor : null,
    }
  }

  async putBase64(base64: string) {
    const key = crypto.randomUUID()

    // Parse the base64 string  
    const { bytes, content_type: fromDataUrl } = parseBase64(base64)

    // Determine the content type
    const ct = fromDataUrl ?? sniffContentType(bytes) ?? "application/octet-stream"

    // Upload the image to the bucket
    const put = await this.bucket.put(key, bytes, { httpMetadata: { contentType: ct } })
    return { 
      key,
      size: bytes.byteLength,
      content_type: ct,
      uploaded: put.uploaded,
      base64, 
    }
  }

  async getAsBase64(key: string) {
    // Get the image from the bucket
    const obj = await this.bucket.get(key)

    // If the image is not found, return null
    if (!obj) return null

    // Convert the image to a Uint8Array
    const u8 = new Uint8Array(await obj.arrayBuffer())
    return {
      key,
      size: u8.byteLength,
      uploaded: obj.uploaded,
      content_type: obj.httpMetadata?.contentType ?? sniffContentType(u8) ?? undefined,
      base64: u8ToBase64(u8)
    }
  }

  async delete(key: string) {
    await this.bucket.delete(key)
    return { key, deleted: true }
  }
}

/* ---------------- helpers ---------------- */

const parseBase64 = (input: string): { bytes: Uint8Array; content_type?: string } => {
  // Parse and return the bytes and mime type
  if (input.startsWith("data:")) {
    const m = input.match(/^data:([^;]+);base64,(.*)$/s)
    if (!m) throw new Error("Invalid data URL")
    const [, mime, payload] = m
    return { bytes: b64ToU8(payload), content_type: mime }
  }
  return { bytes: b64ToU8(input) }
}

const sniffContentType = (u8: Uint8Array): string | undefined => {
  // Detect common image formats by checking magic numbers at start of file

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (u8.length >= 8 &&
      u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47 &&
      u8[4] === 0x0d && u8[5] === 0x0a && u8[6] === 0x1a && u8[7] === 0x0a) return "image/png"
  // JPEG: FF D8 FF
  if (u8.length >= 3 &&
      u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return "image/jpeg"
  // GIF: GIF87a / GIF89a
  if (u8.length >= 6 &&
      u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x38 &&
      (u8[4] === 0x37 || u8[4] === 0x39) && u8[5] === 0x61) return "image/gif"
  // WEBP: RIFF....WEBP
  if (u8.length >= 12 &&
      u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46 &&
      u8[8] === 0x57 && u8[9] === 0x45 && u8[10] === 0x42 && u8[11] === 0x50) return "image/webp"
  return undefined
}

const b64ToU8 = (b64: string): Uint8Array => {
  // @ts-ignore
  return new Uint8Array(Buffer.from(b64, "base64"))
}

const u8ToBase64 = (u8: Uint8Array): string => {
  // @ts-ignore
  return Buffer.from(u8).toString("base64")
}

