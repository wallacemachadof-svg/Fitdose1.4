
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
    options: { value: string; label: string }[];
    value?: string;
    onChange: (value: string, label: string) => void;
    placeholder?: string;
    noResultsText?: string;
    allowCustom?: boolean;
}

export function Combobox({ options, value, onChange, placeholder, noResultsText, allowCustom = false }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value ? options.find(o => o.value === value)?.label : "")

  const handleSelect = (currentValue: string) => {
    const selectedOption = options.find(option => option.value.toLowerCase() === currentValue.toLowerCase());
    const label = selectedOption ? selectedOption.label : currentValue;
    const finalValue = selectedOption ? selectedOption.value : currentValue;

    onChange(finalValue, label);
    setInputValue(label);
    setOpen(false);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (allowCustom) {
        onChange("", e.target.value); // No ID for custom values
    }
  }
  
  const handleInputBlur = () => {
    if (allowCustom && inputValue && !options.some(o => o.label.toLowerCase() === inputValue.toLowerCase())) {
        onChange("", inputValue);
    }
  }

  React.useEffect(() => {
    const currentOption = options.find(option => option.value === value);
    setInputValue(currentOption?.label || value || "");
  }, [value, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {inputValue || placeholder || "Select option..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
            <CommandInput 
                placeholder={placeholder || "Search..."}
                value={inputValue}
                onValueChange={setInputValue}
            />
          <CommandList>
            <CommandEmpty
                onSelect={() => {
                    if (allowCustom) {
                        handleSelect(inputValue || "")
                    }
                }}
                className={cn(allowCustom && inputValue ? "cursor-pointer" : "")}
            >
                {noResultsText || "No results found."}
                {allowCustom && inputValue && <span className="ml-2 text-xs text-muted-foreground">(Salvar como "{inputValue}")</span>}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={(currentLabel) => {
                    const selectedValue = options.find(o => o.label.toLowerCase() === currentLabel.toLowerCase())?.value || "";
                    handleSelect(selectedValue);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
