import Config from "@rahoot/socket/services/config"
import { mimeForStoredFile } from "@rahoot/web/server/media"
import fs from "fs"
import { promises as fsp } from "fs"
import path from "path"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = {
  params: { file: string }
}

export async function GET(_request: Request, { params }: Params) {
  const safeName = path.basename(params.file)

  if (safeName !== params.file) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 })
  }

  const filePath = Config.getMediaPath(safeName)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  try {
    const buffer = await fsp.readFile(filePath)
    const mime = mimeForStoredFile(safeName)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Failed to read media file", error)
    return NextResponse.json({ error: "Unable to read file" }, { status: 500 })
  }
}
