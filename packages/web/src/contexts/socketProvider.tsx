/* eslint-disable no-empty-function */
"use client"

import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@rahoot/common/types/game/socket"
import ky from "ky"
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { io, Socket } from "socket.io-client"
import { v7 as uuid } from "uuid"

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface SocketContextValue {
  socket: TypedSocket | null
  isConnected: boolean
  clientId: string
  connect: () => void
  disconnect: () => void
  reconnect: () => void
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  clientId: "",
  connect: () => {},
  disconnect: () => {},
  reconnect: () => {},
})

const getSocketServer = async () => {
  try {
    const res = await ky.get("/socket").json<{ url: string }>()
    if (res.url) return res.url
  } catch (error) {
    console.error("Failed to fetch socket url, using fallback", error)
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location
    const isHttps = protocol === "https:"
    const port =
      window.location.port && window.location.port !== "3000"
        ? window.location.port
        : "3001"
    const scheme = isHttps ? "https:" : "http:"

    return `${scheme}//${hostname}:${port}`
  }

  return "http://localhost:3001"
}

const getClientId = (): string => {
  try {
    const stored = localStorage.getItem("client_id")

    if (stored) {
      return stored
    }

    const newId = uuid()
    localStorage.setItem("client_id", newId)

    return newId
  } catch {
    return uuid()
  }
}

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<TypedSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [clientId] = useState<string>(() => getClientId())

  useEffect(() => {
    if (socket) {
      return
    }

    let s: TypedSocket | null = null

    const initSocket = async () => {
      try {
        const socketUrl = await getSocketServer()

        const isHttps = socketUrl.startsWith("https")

        s = io(socketUrl, {
          transports: ["websocket", "polling"],
          autoConnect: false,
          withCredentials: false,
          forceNew: true,
          secure: isHttps,
          auth: {
            clientId,
          },
          reconnection: true,
          reconnectionAttempts: 5,
          timeout: 12000,
        })

        setSocket(s)

        s.on("connect", () => {
          setIsConnected(true)
        })

        s.on("disconnect", () => {
          setIsConnected(false)
        })

        s.on("connect_error", (err) => {
          console.error("Connection error:", err.message, {
            url: socketUrl,
            transport: s?.io?.opts?.transports,
          })
        })
      } catch (error) {
        console.error("Failed to initialize socket:", error)
      }
    }

    initSocket()

    // eslint-disable-next-line consistent-return
    return () => {
      s?.disconnect()
    }
  }, [clientId])

  const connect = useCallback(() => {
    if (socket && !socket.connected) {
      socket.connect()
    }
  }, [socket])

  const disconnect = useCallback(() => {
    if (socket && socket.connected) {
      socket.disconnect()
    }
  }, [socket])

  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect()
      socket.connect()
    }
  }, [socket])

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        clientId,
        connect,
        disconnect,
        reconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)

export const useEvent = <E extends keyof ServerToClientEvents>(
  event: E,
  callback: ServerToClientEvents[E],
) => {
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) {
      return
    }

    socket.on(event, callback as any)

    // eslint-disable-next-line consistent-return
    return () => {
      socket.off(event, callback as any)
    }
  }, [socket, event, callback])
}
