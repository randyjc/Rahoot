import { deleteMediaFile } from "@rahoot/web/server/media"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = {
  params: { file: string }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const decoded = decodeURIComponent(params.file)
    await deleteMediaFile(decoded)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete media", error)
    const message = error instanceof Error ? error.message : "Failed to delete file"

    const status = message.includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
