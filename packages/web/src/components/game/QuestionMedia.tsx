"use client"

import type { QuestionMedia as QuestionMediaType } from "@rahoot/common/types/game"
import clsx from "clsx"

type Props = {
  media?: QuestionMediaType
  alt: string
  onPlayChange?: (_playing: boolean) => void
}

const QuestionMedia = ({ media, alt, onPlayChange }: Props) => {
  if (!media) {
    return null
  }

  const containerClass = "mx-auto flex w-full max-w-3xl justify-center"

  switch (media.type) {
    case "image":
      return (
        <div className={containerClass}>
          <img
            alt={alt}
            src={media.url}
            className="m-4 h-full max-h-[400px] min-h-[200px] w-auto max-w-full rounded-md object-contain shadow-lg"
          />
        </div>
      )

    case "audio":
      return (
        <div className={clsx(containerClass, "px-4")}>
          <audio
            controls
            crossOrigin="anonymous"
            src={media.url}
            className="mt-4 w-full rounded-md bg-black/40 p-2 shadow-lg"
            preload="none"
            onPlay={() => onPlayChange?.(true)}
            onPause={() => onPlayChange?.(false)}
            onEnded={() => onPlayChange?.(false)}
          />
        </div>
      )

    case "video":
      return (
        <div className={containerClass}>
          <video
            controls
            crossOrigin="anonymous"
            playsInline
            src={media.url}
            className="m-4 w-full max-w-3xl rounded-md shadow-lg"
            preload="metadata"
            onPlay={() => onPlayChange?.(true)}
            onPause={() => onPlayChange?.(false)}
            onEnded={() => onPlayChange?.(false)}
          />
        </div>
      )

    default:
      return null
  }
}

export default QuestionMedia
