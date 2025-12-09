"use client"

import Room from "@rahoot/web/components/game/join/Room"
import Username from "@rahoot/web/components/game/join/Username"
import { useEvent, useSocket } from "@rahoot/web/contexts/socketProvider"
import { usePlayerStore } from "@rahoot/web/stores/player"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

const Home = () => {
  const { isConnected, connect, socket } = useSocket()
  const { player } = usePlayerStore()
  const router = useRouter()

  useEffect(() => {
    if (!isConnected) {
      connect()
    }
  }, [connect, isConnected])

  useEffect(() => {
    if (!isConnected) return
    try {
      const storedGameId = localStorage.getItem("last_game_id")
      if (storedGameId) {
        socket?.emit("player:reconnect", { gameId: storedGameId })
        router.replace(`/game/${storedGameId}`)
      }
    } catch {
      // ignore
    }
  }, [isConnected, socket, router])

  useEvent("game:errorMessage", (message) => {
    toast.error(message)
  })

  if (player) {
    return <Username />
  }

  return <Room />
}

export default Home
