import { listStoredMedia, storeMediaFile } from "@rahoot/web/server/media"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const media = await listStoredMedia()

    return NextResponse.json({ media })
  } catch (error) {
    console.error("Failed to list media", error)
    return NextResponse.json(
      { error: "Unable to list uploaded media" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received" }, { status: 400 })
  }

  try {
    const media = await storeMediaFile(file)

    return NextResponse.json({ media })
  } catch (error) {
    console.error("Failed to store media", error)
    const message = error instanceof Error ? error.message : "Failed to upload file"

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
