import Config from "@rahoot/socket/services/config"
import { mimeForStoredFile } from "@rahoot/web/server/media"
import fs from "fs"
import { promises as fsp } from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ file: string }> },
) {
  const params = await context.params
  const safeName = path.basename(params.file)

  if (safeName !== params.file) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 })
  }

  const filePath = Config.getMediaPath(safeName)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  try {
    const stat = await fsp.stat(filePath)
    const fileSize = stat.size
    const mime = mimeForStoredFile(safeName)
    const range = _request.headers.get("range")

    // Basic range support improves Safari/iOS playback
    if (range) {
      const bytesPrefix = "bytes="
      if (!range.startsWith(bytesPrefix)) {
        return new NextResponse(null, { status: 416 })
      }

      const [rawStart, rawEnd] = range.replace(bytesPrefix, "").split("-")
      const start = Number(rawStart)
      const end = rawEnd ? Number(rawEnd) : fileSize - 1

      if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
        return new NextResponse(null, { status: 416 })
      }

      const chunkSize = end - start + 1
      const stream = fs.createReadStream(filePath, { start, end })

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mime,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      })
    }

    const buffer = await fsp.readFile(filePath)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Failed to read media file", error)
    return NextResponse.json({ error: "Unable to read file" }, { status: 500 })
  }
}
