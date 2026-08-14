"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  items: Array<{ value: string; label: React.ReactNode }>
  registerItem: (value: string, label: React.ReactNode) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

const useSelect = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within Select")
  }
  return context
}

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

const Select = ({ value = "", onValueChange = () => { }, children }: SelectProps) => {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<Array<{ value: string; label: React.ReactNode }>>([])

  const registerItem = React.useCallback((val: string, label: React.ReactNode) => {
    setItems(prev => {
      if (prev.some(item => item.value === val)) return prev
      return [...prev, { value: val, label }]
    })
  }, [])

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, items, registerItem }}>
      <div className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useSelect()

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-[0.99]",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", open && "rotate-180")} />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value, items } = useSelect()
  const selectedItem = items.find(item => item.value === value)

  return <span className="block truncate">{selectedItem ? selectedItem.label : placeholder}</span>
}

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useSelect()

  React.useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (ref && "current" in ref && ref.current && !ref.current.contains(e.target as Node)) {
        // Delay closing slightly to allow Trigger click to register first if it was the click target
        setTimeout(() => setOpen(false), 10)
      }
    }

    document.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, setOpen, ref])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        // Explicit background/border, NOT bg-popover: this Tailwind v4 setup
        // defines --popover as a bare HSL triple but never maps --color-popover,
        // so `bg-popover` resolved to nothing and every dropdown in the app
        // rendered transparent — the options sat unreadably on top of whatever
        // was behind them. Same trap as `bg-card` (see CLAUDE.md).
        "absolute top-full z-50 mt-2 min-w-[8rem] w-full overflow-hidden rounded-md border border-slate-200 bg-white text-slate-900 shadow-lg animate-in fade-in-0 zoom-in-95 duration-100",
        className
      )}
      {...props}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  )
})
SelectContent.displayName = "SelectContent"

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const { value: selectedValue, onValueChange, setOpen, registerItem } = useSelect()

    React.useEffect(() => {
      registerItem(value, children)
    }, [value, children, registerItem])

    return (
      <div
        ref={ref}
        onClick={(e) => {
          e.stopPropagation()
          onValueChange(value)
          setOpen(false)
        }}
        className={cn(
          // Explicit hover/selected colours for the same reason as the panel
          // above — `bg-accent` resolves to nothing here, which left the list
          // with no hover feedback and no visible selected row.
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100",
          selectedValue === value && "bg-slate-100 font-semibold",
          className
        )}
        {...props}
      >
        {selectedValue === value && (
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <Check className="h-4 w-4" />
          </span>
        )}
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }

