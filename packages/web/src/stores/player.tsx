import { StatusDataMap } from "@rahoot/common/types/game/status"
import { createStatus, Status } from "@rahoot/web/utils/createStatus"
import { create } from "zustand"

type PlayerState = {
  username?: string
  points?: number
}

type PlayerStore<T> = {
  gameId: string | null
  player: PlayerState | null
  status: Status<T> | null

  setGameId: (_gameId: string | null) => void

  setPlayer: (_state: PlayerState) => void
  login: (_gameId: string) => void
  join: (_username: string) => void
  updatePoints: (_points: number) => void

  setStatus: <K extends keyof T>(_name: K, _data: T[K]) => void

  reset: () => void
}

const initialState = {
  gameId: null,
  player: null,
  status: null,
}

export const usePlayerStore = create<PlayerStore<StatusDataMap>>((set) => ({
  ...initialState,

  setGameId: (gameId) => set({ gameId }),

  setPlayer: (player: PlayerState) => {
    try {
      if (player.username) localStorage.setItem("last_username", player.username)
      if (typeof player.points === "number") {
        localStorage.setItem("last_points", String(player.points))
      }
    } catch {}
    set({ player })
  },
  login: (username) =>
    set((state) => {
      try {
        localStorage.setItem("last_username", username)
      } catch {}
      return {
        player: { ...state.player, username },
      }
    }),

  join: (gameId) => {
    set((state) => ({
      gameId,
      player: { ...state.player, points: 0 },
    }))
  },

  updatePoints: (points) => {
    try {
      localStorage.setItem("last_points", String(points))
    } catch {}
    set((state) => ({
      player: { ...state.player, points },
    }))
  },

  setStatus: (name, data) => set({ status: createStatus(name, data) }),

  reset: () => {
    try {
      localStorage.removeItem("last_username")
      localStorage.removeItem("last_points")
    } catch {}
    set(initialState)
  },
}))
