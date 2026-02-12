"use client"

import * as React from "react"
import Editor, {
  BtnBold,
  BtnBulletList,
  BtnClearFormatting,
  BtnItalic,
  BtnLink,
  BtnNumberedList,
  BtnRedo,
  BtnStrikeThrough,
  BtnUnderline,
  BtnUndo,
  Toolbar,
  type ContentEditableEvent,
  useEditorState,
} from "react-simple-wysiwyg"
import { Highlighter, Palette } from "lucide-react"

import { cn } from "@/lib/utils"

// TODO: Replace with Slate.js or Lexical

export type RichTextEditorProps = Omit<
  React.ComponentProps<typeof Editor>,
  "value" | "onChange" | "containerProps"
> & {
  value: string
  onChange: (value: string) => void
  containerProps?: React.ComponentProps<"div">
  toolbar?: React.ReactNode | null
}

type ColorButtonProps = {
  title: string
  command: "foreColor" | "hiliteColor"
  label: React.ReactNode
}

const ColorButton: React.FC<ColorButtonProps> = ({ title, command, label }) => {
  const editorState = useEditorState()
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  if (editorState.htmlMode) return null

  const applyColor = (value: string) => {
    const el = editorState.$el
    if (!el) return
    if (document.activeElement !== el) {
      el.focus()
    }
    document.execCommand(command, false, value)
  }

  return (
    <>
      <button
        type="button"
        className="rsw-btn"
        title={title}
        onMouseDown={(event) => {
          event.preventDefault()
          inputRef.current?.click()
        }}
      >
        <span className="inline-flex h-4 w-4 items-center justify-center">
          {label}
        </span>
      </button>
      <input
        ref={inputRef}
        type="color"
        className="sr-only"
        onChange={(event) => applyColor(event.target.value)}
      />
    </>
  )
}

const defaultToolbar = (
  <Toolbar className="rsw-toolbar">
    <BtnUndo />
    <BtnRedo />
    <span className="rsw-separator" />
    <BtnBold />
    <BtnItalic />
    <BtnUnderline />
    <BtnStrikeThrough />
    <ColorButton title="Text color" command="foreColor" label={<Palette className="h-3.5 w-3.5" />} />
    <ColorButton title="Highlight" command="hiliteColor" label={<Highlighter className="h-3.5 w-3.5" />} />
    <span className="rsw-separator" />
    <BtnBulletList />
    <BtnNumberedList />
    <BtnLink />
    <BtnClearFormatting />
  </Toolbar>
)

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  (
    { value, onChange, className, containerProps, toolbar, ...props },
    ref
  ) => {
    const handleChange = React.useCallback(
      (event: ContentEditableEvent) => {
        onChange(event.target.value)
      },
      [onChange]
    )

    return (
      <Editor
        ref={ref}
        value={value}
        onChange={handleChange}
        containerProps={{
          ...containerProps,
          "data-disabled":
            containerProps?.["data-disabled"] ??
            (props.disabled ? "true" : undefined),
          className: cn(
            "rsw-theme !overflow-hidden !rounded-md !border !border-slate-200 !bg-white !shadow-none focus-within:outline-none focus-within:!border-slate-400 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 dark:!border-slate-800 dark:!bg-slate-950 dark:focus-within:!border-slate-600",
            "[&[data-toolbar-hidden=true]_.rsw-toolbar]:!hidden",
            "[&_.rsw-toolbar]:!flex [&_.rsw-toolbar]:!flex-wrap [&_.rsw-toolbar]:!items-center [&_.rsw-toolbar]:!gap-0.5 [&_.rsw-toolbar]:!border-b [&_.rsw-toolbar]:!border-slate-200 [&_.rsw-toolbar]:!bg-slate-100/80 [&_.rsw-toolbar]:!px-1.5 [&_.rsw-toolbar]:!py-1 dark:[&_.rsw-toolbar]:!border-slate-800 dark:[&_.rsw-toolbar]:!bg-slate-900",
            "[&_.rsw-btn]:!h-6.5 [&_.rsw-btn]:!w-6.5 [&_.rsw-btn]:!rounded-md [&_.rsw-btn]:!text-[13px] [&_.rsw-btn]:!text-slate-700 dark:[&_.rsw-btn]:!text-slate-100 [&_.rsw-btn]:!transition-colors [&_.rsw-btn:hover]:!bg-slate-200/80 dark:[&_.rsw-btn:hover]:!bg-slate-800 [&_.rsw-btn[data-active=true]]:!bg-slate-200/90 dark:[&_.rsw-btn[data-active=true]]:!bg-slate-800",
            "[&_.rsw-separator]:!mx-0.5 [&_.rsw-separator]:!h-4 [&_.rsw-separator]:!w-px [&_.rsw-separator]:!bg-transparent [&_.rsw-separator]:!border-r [&_.rsw-separator]:!border-slate-300/90 dark:[&_.rsw-separator]:!border-slate-600/60",
            "[&_.rsw-dd]:!rounded-md [&_.rsw-dd]:!border [&_.rsw-dd]:!border-slate-200 [&_.rsw-dd]:!bg-white [&_.rsw-dd]:!px-2 [&_.rsw-dd]:!py-1 [&_.rsw-dd]:!text-sm dark:[&_.rsw-dd]:!border-slate-700 dark:[&_.rsw-dd]:!bg-slate-900",
            "[&_.rsw-ce]:!min-h-[140px] [&_.rsw-ce]:!w-full [&_.rsw-ce]:!bg-white [&_.rsw-ce]:!px-3 [&_.rsw-ce]:!py-2 [&_.rsw-ce]:!text-base [&_.rsw-ce]:!text-slate-900 [&_.rsw-ce]:!outline-none [&_.rsw-ce]:placeholder:!text-slate-500 dark:[&_.rsw-ce]:!bg-slate-950 dark:[&_.rsw-ce]:!text-slate-100 dark:[&_.rsw-ce]:placeholder:!text-slate-400 [&_.rsw-ce:focus]:!outline-none",
            containerProps?.className
          ),
        }}
        className={cn(
          "!bg-transparent [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:underline [&_a]:underline-offset-4",
          className
        )}
        {...props}
      >
        {toolbar === undefined ? defaultToolbar : toolbar}
      </Editor>
    )
  }
)
RichTextEditor.displayName = "RichTextEditor"

export { RichTextEditor }
