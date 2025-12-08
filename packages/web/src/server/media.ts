import type { QuestionMedia, QuizzWithId } from "@rahoot/common/types/game"
import Config from "@rahoot/socket/services/config"
import fs from "fs"
import { promises as fsp } from "fs"
import path from "path"

export type StoredMedia = {
  fileName: string
  url: string
  size: number
  mime: string
  type: QuestionMedia["type"]
  usedBy: {
    quizzId: string
    subject: string
    questionIndex: number
    question: string
  }[]
}

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024 // 50MB

const ensureMediaFolder = () => {
  Config.ensureBaseFolders()
  const folder = Config.getMediaPath()

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true })
  }

  return folder
}

const inferMimeFromName = (fileName: string) => {
  const ext = path.extname(fileName).toLowerCase()

  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].includes(ext)) {
    return `image/${ext.replace(".", "") || "jpeg"}`
  }

  if ([".mp3", ".wav", ".ogg", ".aac", ".m4a", ".flac"].includes(ext)) {
    return `audio/${ext.replace(".", "") || "mpeg"}`
  }

  if ([".mp4", ".webm", ".mov", ".ogv", ".mkv"].includes(ext)) {
    return `video/${ext.replace(".", "") || "mp4"}`
  }

  return "application/octet-stream"
}

const inferMediaType = (mime: string): QuestionMedia["type"] | null => {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("audio/")) return "audio"
  if (mime.startsWith("video/")) return "video"
  return null
}

const sanitizeFileName = (name: string) => {
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_")
  return safeName || `media-${Date.now()}`
}

const resolveStoredFileName = (fileName: string) => {
  const safeName = path.basename(fileName)

  if (safeName !== fileName) {
    throw new Error("Invalid file name")
  }

  return safeName
}

const usageIndex = (quizzList: QuizzWithId[]) => {
  const usage = new Map<string, StoredMedia["usedBy"]>()

  const recordUsage = (
    fileName: string | null,
    quizz: QuizzWithId,
    questionIndex: number,
    questionTitle: string,
  ) => {
    if (!fileName) return

    try {
      const safeName = resolveStoredFileName(fileName)
      const entries = usage.get(safeName) || []
      entries.push({
        quizzId: quizz.id,
        subject: quizz.subject,
        questionIndex,
        question: questionTitle,
      })
      usage.set(safeName, entries)
    } catch (error) {
      console.warn("Skipped invalid media reference", { fileName, error })
    }
  }

  quizzList.forEach((quizz) => {
    quizz.questions.forEach((question, idx) => {
      const mediaFile = (() => {
        if (question.media?.fileName) return question.media.fileName
        if (question.media?.url?.startsWith("/media/")) {
          try {
            return resolveStoredFileName(
              decodeURIComponent(question.media.url.split("/").pop() || ""),
            )
          } catch (error) {
            console.warn("Skipped invalid media url reference", {
              url: question.media.url,
              error,
            })
            return null
          }
        }
        return null
      })()

      const imageFile = (() => {
        if (!question.image?.startsWith("/media/")) return null
        try {
          return resolveStoredFileName(
            decodeURIComponent(question.image.split("/").pop() || ""),
          )
        } catch (error) {
          console.warn("Skipped invalid image url reference", {
            url: question.image,
            error,
          })
          return null
        }
      })()

      recordUsage(mediaFile, quizz, idx, question.question)
      recordUsage(imageFile, quizz, idx, question.question)
    })
  })

  return usage
}

export const listStoredMedia = async (): Promise<StoredMedia[]> => {
  const folder = ensureMediaFolder()
  const files = await fsp.readdir(folder)
  const quizz = Config.quizz()
  const usage = usageIndex(quizz)

  const entries = await Promise.all(
    files.map(async (fileName) => {
      const stats = await fsp.stat(path.join(folder, fileName))
      const mime = inferMimeFromName(fileName)
      const type = inferMediaType(mime) || "video"

      return {
        fileName,
        url: `/media/${encodeURIComponent(fileName)}`,
        size: stats.size,
        mime,
        type,
        usedBy: usage.get(fileName) || [],
      }
    }),
  )

  // Keep a stable order for repeatable responses
  return entries.sort((a, b) => a.fileName.localeCompare(b.fileName))
}

export const storeMediaFile = async (file: File): Promise<StoredMedia> => {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.byteLength > MAX_UPLOAD_SIZE) {
    throw new Error("File is too large. Max 50MB.")
  }

  const targetFolder = ensureMediaFolder()
  const incomingMime = file.type || "application/octet-stream"
  const mediaType = inferMediaType(incomingMime)

  if (!mediaType) {
    throw new Error("Unsupported media type")
  }

  const incomingName = file.name || `${mediaType}-upload`
  const safeName = sanitizeFileName(incomingName)
  const ext = path.extname(safeName) || `.${incomingMime.split("/")[1] || "bin"}`
  const baseName = path.basename(safeName, ext)

  let finalName = `${baseName}${ext}`
  let finalPath = path.join(targetFolder, finalName)
  let counter = 1

  while (fs.existsSync(finalPath)) {
    finalName = `${baseName}-${counter}${ext}`
    finalPath = path.join(targetFolder, finalName)
    counter += 1
  }

  await fsp.writeFile(finalPath, buffer)

  const mime = incomingMime || inferMimeFromName(finalName)

  return {
    fileName: finalName,
    url: `/media/${encodeURIComponent(finalName)}`,
    size: buffer.byteLength,
    mime,
    type: mediaType,
    usedBy: [],
  }
}

export const deleteMediaFile = async (fileName: string) => {
  const folder = ensureMediaFolder()
  const safeName = resolveStoredFileName(fileName)
  const filePath = path.join(folder, safeName)

  if (!fs.existsSync(filePath)) {
    throw new Error("File not found")
  }

  const usage = usageIndex(Config.quizz())
  const usedBy = usage.get(safeName) || []

  if (usedBy.length > 0) {
    const details = usedBy
      .map(
        (entry) =>
          `${entry.subject || entry.quizzId} (question ${entry.questionIndex + 1})`,
      )
      .join(", ")

    throw new Error(`File is still used by: ${details}`)
  }

  await fsp.unlink(filePath)
}

export const mimeForStoredFile = (fileName: string) => inferMimeFromName(fileName)
