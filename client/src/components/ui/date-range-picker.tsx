import * as React from "react"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DateRange {
  from?: Date
  to?: Date
}

interface DatePickerWithRangeProps {
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  className?: string
}

export function DatePickerWithRange({
  date,
  onDateChange,
  className
}: DatePickerWithRangeProps) {
  const [fromDate, setFromDate] = React.useState<string>(
    date?.from ? date.from.toISOString().split('T')[0] : ''
  )
  const [toDate, setToDate] = React.useState<string>(
    date?.to ? date.to.toISOString().split('T')[0] : ''
  )

  const handleFromDateChange = (value: string) => {
    setFromDate(value)
    const newFromDate = value ? new Date(value) : undefined
    onDateChange?.({
      from: newFromDate,
      to: date?.to
    })
  }

  const handleToDateChange = (value: string) => {
    setToDate(value)
    const newToDate = value ? new Date(value) : undefined
    onDateChange?.({
      from: date?.from,
      to: newToDate
    })
  }

  const clearDates = () => {
    setFromDate('')
    setToDate('')
    onDateChange?.({})
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => handleFromDateChange(e.target.value)}
          placeholder="From date"
          className="w-40"
        />
        <span className="text-gray-500">to</span>
        <Input
          type="date"
          value={toDate}
          onChange={(e) => handleToDateChange(e.target.value)}
          placeholder="To date"
          className="w-40"
        />
        {(fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDates}
            className="h-8 px-2"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
