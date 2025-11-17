import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface CurrencySelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

export function CurrencySelector({ value, onValueChange }: CurrencySelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select currency" />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            {currency.symbol} {currency.code} - {currency.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("base_currency", fromCurrency)
    .eq("target_currency", toCurrency)
    .single();

  if (error || !data) {
    console.error("Currency conversion error:", error);
    return amount;
  }

  return amount * Number(data.rate);
}

export function formatCurrency(amount: number, currency: string): string {
  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  return `${currencyInfo?.symbol || ""}${amount.toLocaleString()}`;
}
