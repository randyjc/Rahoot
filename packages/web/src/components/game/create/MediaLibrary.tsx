"use client"

import Button from "@rahoot/web/components/Button"
import { useEffect, useState } from "react"

type MediaItem = {
  fileName: string
  url: string
  size: number
  mime: string
  type: string
  usedBy: {
    quizzId: string
    subject: string
    questionIndex: number
    question: string
  }[]
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${value.toFixed(value >= 10 || value % 1 === 0 ? 0 : 1)} ${units[i]}`
}

const MediaLibrary = () => {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/media", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load media")
      setItems(data.media || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (fileName: string) => {
    setDeleting((prev) => ({ ...prev, [fileName]: true }))
    try {
      const res = await fetch(`/api/media/${encodeURIComponent(fileName)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete file")
      load()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to delete")
    } finally {
      setDeleting((prev) => ({ ...prev, [fileName]: false }))
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Media library</h2>
          <p className="text-sm text-gray-500">
            Uploaded files with their usage. Delete is enabled only when unused.
          </p>
        </div>
        <Button className="bg-gray-700" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="p-2">File</th>
              <th className="p-2">Type</th>
              <th className="p-2">Size</th>
              <th className="p-2">Used by</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.fileName} className="border-b border-gray-100">
                <td className="p-2 font-semibold text-gray-800">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    {item.fileName}
                  </a>
                </td>
                <td className="p-2">{item.type}</td>
                <td className="p-2 text-gray-600">{formatBytes(item.size)}</td>
                <td className="p-2">
                  {item.usedBy.length === 0 ? (
                    <span className="text-green-700">Unused</span>
                  ) : (
                    <div className="space-y-1">
                      {item.usedBy.map((u, idx) => (
                        <div key={idx} className="text-gray-700">
                          <span className="font-semibold">{u.subject || u.quizzId}</span>
                          {` – Q${u.questionIndex + 1}: ${u.question}`}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-2">
                  <Button
                    className="bg-red-500 px-3 py-1 text-sm"
                    onClick={() => handleDelete(item.fileName)}
                    disabled={item.usedBy.length > 0 || deleting[item.fileName]}
                  >
                    {deleting[item.fileName] ? "Deleting..." : "Delete"}
                  </Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td className="p-3 text-sm text-gray-500" colSpan={5}>
                  No media uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MediaLibrary
