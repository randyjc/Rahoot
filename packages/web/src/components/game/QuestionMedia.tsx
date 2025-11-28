"use client"

import { QuestionMedia } from "@rahoot/common/types/game"
import clsx from "clsx"
import { useEffect, useMemo, useRef, useState } from "react"

type YoutubeAPI = {
  Player: new (_element: string, _options: any) => {
    destroy: () => void
  }
  PlayerState: Record<string, number>
}

let youtubeApiPromise: Promise<YoutubeAPI | null> | null = null

const loadYoutubeApi = () => {
  if (typeof window === "undefined") {
    return Promise.resolve(null)
  }

  const existingApi = (window as any).YT as YoutubeAPI | undefined

  if (existingApi && existingApi.Player) {
    return Promise.resolve(existingApi)
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      tag.async = true

      const handleError = () => resolve(null)
      tag.onerror = handleError

      const existing = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      )
      if (existing) {
        existing.addEventListener("error", handleError)
      }

      document.head.appendChild(tag)

      const win = window as any

      const prevOnReady = win.onYouTubeIframeAPIReady
      win.onYouTubeIframeAPIReady = () => {
        prevOnReady?.()
        resolve(win.YT as YoutubeAPI)
      }
    })
  }

  return youtubeApiPromise
}

const extractYoutubeId = (url: string) => {
  try {
    const parsed = new URL(url)

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "")
    }

    if (parsed.searchParams.get("v")) {
      return parsed.searchParams.get("v")
    }

    const parts = parsed.pathname.split("/")
    const embedIndex = parts.indexOf("embed")
    if (embedIndex !== -1 && parts[embedIndex + 1]) {
      return parts[embedIndex + 1]
    }
  } catch (error) {
    console.error("Invalid youtube url", error)
  }

  return null
}

type Props = {
  media?: QuestionMedia
  alt: string
  onPlayChange?: (_playing: boolean) => void
}

const QuestionMedia = ({ media, alt, onPlayChange }: Props) => {
  const youtubeContainerId = useMemo(
    () => `yt-${Math.random().toString(36).slice(2, 10)}`,
    [],
  )
  const youtubePlayerRef = useRef<any | null>(null)
  const youtubeMounted = useRef(false)
  const [youtubeReady, setYoutubeReady] = useState(false)
  const [youtubePlaying, setYoutubePlaying] = useState(false)

  useEffect(() => {
    if (media?.type !== "youtube") {
      return
    }

    youtubeMounted.current = true
    const videoId = extractYoutubeId(media.url)

    if (!videoId) {
      return
    }

    loadYoutubeApi().then((YT) => {
      if (!YT || !youtubeMounted.current) {
        return
      }

      youtubePlayerRef.current = new YT.Player(youtubeContainerId, {
        videoId,
        playerVars: {
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          origin:
            typeof window !== "undefined" ? window.location.origin : undefined,
          showinfo: 0,
        },
        host: "https://www.youtube-nocookie.com",
        events: {
          onReady: () => {
            setYoutubeReady(true)
          },
          onStateChange: (event) => {
            const { data } = event
            const isPlaying =
              data === YT.PlayerState.PLAYING ||
              data === YT.PlayerState.BUFFERING
            const isStopped =
              data === YT.PlayerState.PAUSED ||
              data === YT.PlayerState.ENDED ||
              data === YT.PlayerState.UNSTARTED

            if (isPlaying) {
              setYoutubePlaying(true)
              onPlayChange?.(true)
            } else if (isStopped) {
              setYoutubePlaying(false)
              onPlayChange?.(false)
            }
          },
        },
      })
    })

    return () => {
      youtubeMounted.current = false
      youtubePlayerRef.current?.destroy()
      youtubePlayerRef.current = null
      setYoutubeReady(false)
      setYoutubePlaying(false)
      onPlayChange?.(false)
    }
  }, [media?.type, media?.url, onPlayChange, youtubeContainerId])

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
            src={media.url}
            className="m-4 w-full max-w-3xl rounded-md shadow-lg"
            preload="metadata"
            onPlay={() => onPlayChange?.(true)}
            onPause={() => onPlayChange?.(false)}
            onEnded={() => onPlayChange?.(false)}
          />
        </div>
      )

    case "youtube": {
      return (
        <div className={clsx(containerClass, "px-4")}>
          <div
            className="relative mt-4 w-full overflow-hidden rounded-md shadow-lg bg-black"
            style={{ paddingTop: "56.25%" }}
          >
            <div
              id={youtubeContainerId}
              className={clsx(
                "absolute left-0 top-0 h-full w-full",
                youtubeReady ? "opacity-100" : "opacity-0",
              )}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/20" />
            <div className="absolute inset-0 flex items-center justify-center gap-3">
              <button
                className={clsx(
                  "pointer-events-auto rounded-full bg-white/80 px-4 py-2 text-sm font-semibold shadow",
                  (!youtubeReady) && "opacity-50",
                )}
                disabled={!youtubeReady}
                onClick={() => {
                  const player = youtubePlayerRef.current
                  if (player && typeof player.playVideo === "function") {
                    player.playVideo()
                  }
                }}
              >
                {youtubePlaying ? "Playing" : "Play"}
              </button>
              <button
                className={clsx(
                  "pointer-events-auto rounded-full bg-white/80 px-4 py-2 text-sm font-semibold shadow",
                  (!youtubeReady) && "opacity-50",
                )}
                disabled={!youtubeReady}
                onClick={() => {
                  const player = youtubePlayerRef.current
                  if (player && typeof player.pauseVideo === "function") {
                    player.pauseVideo()
                  }
                }}
              >
                Pause
              </button>
            </div>
          </div>
        </div>
      )
    }
  }

  return null
}

export default QuestionMedia
