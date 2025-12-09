import clsx from "clsx"
import { ButtonHTMLAttributes, ElementType, PropsWithChildren } from "react"

type Props = PropsWithChildren &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: ElementType
    selected?: boolean
  }

const AnswerButton = ({
  className,
  icon: Icon,
  children,
  selected = false,
  ...otherProps
}: Props) => (
  <button
    className={clsx(
      "shadow-inset flex items-center gap-3 rounded px-4 py-6 text-left transition-all",
      selected && "ring-4 ring-white/80 shadow-lg",
      className,
    )}
    {...otherProps}
  >
    <Icon className="h-6 w-6" />
    <span className="drop-shadow-md">{children}</span>
  </button>
)

export default AnswerButton
