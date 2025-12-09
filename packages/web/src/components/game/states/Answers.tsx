"use client"

import { CommonStatusDataMap } from "@rahoot/common/types/game/status"
import AnswerButton from "@rahoot/web/components/AnswerButton"
import QuestionMedia from "@rahoot/web/components/game/QuestionMedia"
import { useEvent, useSocket } from "@rahoot/web/contexts/socketProvider"
import { usePlayerStore } from "@rahoot/web/stores/player"
import {
  ANSWERS_COLORS,
  ANSWERS_ICONS,
  SFX_ANSWERS_MUSIC,
  SFX_ANSWERS_SOUND,
} from "@rahoot/web/utils/constants"
import clsx from "clsx"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import useSound from "use-sound"

type Props = {
  data: CommonStatusDataMap["SELECT_ANSWER"]
}

const Answers = ({
  data: {
    question,
    answers,
    image,
    media,
    time,
    totalPlayer,
    allowsMultiple,
  },
}: Props) => {
  const { gameId }: { gameId?: string } = useParams()
  const { socket } = useSocket()
  const { player } = usePlayerStore()

  const [cooldown, setCooldown] = useState(time)
  const [paused, setPaused] = useState(false)
  const [totalAnswer, setTotalAnswer] = useState(0)
  const [isMediaPlaying, setIsMediaPlaying] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)

  const [sfxPop] = useSound(SFX_ANSWERS_SOUND, {
    volume: 0.1,
  })

  const [playMusic, { stop: stopMusic, sound: answersMusic }] = useSound(
    SFX_ANSWERS_MUSIC,
    {
      volume: 0.2,
      interrupt: true,
      loop: true,
    },
  )

  const submitAnswers = (keys: number[]) => {
    if (!player || submitted || keys.length === 0) {
      return
    }

    socket?.emit("player:selectedAnswer", {
      gameId,
      data: {
        answerKeys: keys,
      },
    })
    setSubmitted(true)
    sfxPop()
  }

  const handleAnswer = (answerKey: number) => () => {
    if (!player) {
      return
    }

    if (!allowsMultiple) {
      setSelectedAnswers([answerKey])
      submitAnswers([answerKey])
      return
    }

    setSelectedAnswers((prev) =>
      prev.includes(answerKey)
        ? prev.filter((key) => key !== answerKey)
        : [...prev, answerKey],
    )
  }

  useEffect(() => {
    playMusic()

    return () => {
      stopMusic()
    }
  }, [playMusic])

  useEffect(() => {
    if (!answersMusic) {
      return
    }

    answersMusic.volume(isMediaPlaying ? 0.05 : 0.2)
  }, [answersMusic, isMediaPlaying])

  useEvent("game:cooldown", (sec) => {
    setCooldown(sec)
  })

  useEvent("game:cooldownPause", (isPaused) => {
    setPaused(isPaused)
  })

  useEvent("game:playerAnswer", (count) => {
    setTotalAnswer(count)
    sfxPop()
  })

  useEffect(() => {
    setCooldown(time)
    setPaused(false)
    setSelectedAnswers([])
    setSubmitted(false)
    setTotalAnswer(0)
  }, [question, time])

  return (
    <div className="flex h-full flex-1 flex-col justify-between">
      <div className="mx-auto inline-flex h-full w-full max-w-7xl flex-1 flex-col items-center justify-center gap-5">
        <h2 className="text-center text-2xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
          {question}
        </h2>
        {allowsMultiple && (
          <p className="rounded-full bg-black/40 px-4 py-2 text-sm font-semibold text-white">
            Select all correct answers, then submit.
          </p>
        )}

        <QuestionMedia
          media={media || (image ? { type: "image", url: image } : undefined)}
          alt={question}
          onPlayChange={(playing) => setIsMediaPlaying(playing)}
        />
      </div>

      <div>
        <div className="mx-auto mb-4 flex w-full max-w-7xl justify-between gap-1 px-2 text-lg font-bold text-white md:text-xl">
          <div className="flex flex-col items-center rounded-full bg-black/40 px-4 text-lg font-bold">
            <span className="translate-y-1 text-sm">Time</span>
            <span>{cooldown}</span>
            {paused && (
              <span className="text-xs font-semibold uppercase text-amber-200">
                Paused
              </span>
            )}
          </div>
          <div className="flex flex-col items-center rounded-full bg-black/40 px-4 text-lg font-bold">
            <span className="translate-y-1 text-sm">Answers</span>
            <span>
              {totalAnswer}/{totalPlayer}
            </span>
          </div>
        </div>

        <div className="mx-auto mb-4 grid w-full max-w-7xl grid-cols-2 gap-1 rounded-full px-2 text-lg font-bold text-white md:text-xl">
          {answers.map((answer, key) => (
            <AnswerButton
              key={key}
              className={clsx(ANSWERS_COLORS[key])}
              icon={ANSWERS_ICONS[key]}
              onClick={handleAnswer(key)}
              disabled={submitted}
              selected={selectedAnswers.includes(key)}
            >
              {answer}
            </AnswerButton>
          ))}
        </div>
        {allowsMultiple && (
          <div className="mx-auto flex w-full max-w-7xl justify-end px-2">
            <button
              type="button"
              onClick={() => submitAnswers(selectedAnswers)}
              disabled={submitted || selectedAnswers.length === 0}
              className={clsx(
                "rounded bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-white",
                (submitted || selectedAnswers.length === 0) &&
                  "cursor-not-allowed opacity-60",
              )}
            >
              {submitted ? "Submitted" : "Submit answers"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Answers
