import { deleteMediaFile } from "@rahoot/web/server/media"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ file: string }> },
) {
  try {
    const params = await context.params
    const fileParam = params.file

    if (!fileParam) {
      return NextResponse.json({ error: "Missing file parameter" }, { status: 400 })
    }

    const decoded = decodeURIComponent(fileParam)
    await deleteMediaFile(decoded)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete media", error)
    const message = error instanceof Error ? error.message : "Failed to delete file"

    const status = message.includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
