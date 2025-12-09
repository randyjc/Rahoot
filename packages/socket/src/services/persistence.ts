import { createClient } from "redis"

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"

const redis =
  createClient({ url: redisUrl })
    .on("error", (err) => console.error("Redis Client Error", err))

export type GameSnapshot = Record<string, any>

export const connectRedis = async () => {
  if (!redis.isOpen) {
    await redis.connect()
  }
}

export const saveSnapshot = async (gameId: string, snapshot: GameSnapshot) => {
  if (!gameId) return
  await connectRedis()
  await redis.set(`game:${gameId}`, JSON.stringify(snapshot), {
    EX: 60 * 60 * 6, // 6 hours
  })
}

export const loadSnapshot = async (gameId: string): Promise<GameSnapshot | null> => {
  if (!gameId) return null
  await connectRedis()
  const raw = await redis.get(`game:${gameId}`)
  return raw ? (JSON.parse(raw) as GameSnapshot) : null
}

export const deleteSnapshot = async (gameId: string) => {
  if (!gameId) return
  await connectRedis()
  await redis.del(`game:${gameId}`)
}
