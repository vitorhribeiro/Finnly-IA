export function formatCurrencyInput(value: string | number): string {
  const strValue = typeof value === 'number' ? value.toFixed(2) : String(value)
  // Extract only numbers
  let digits = strValue.replace(/\D/g, '')
  if (!digits) return '0,00'
  
  // Parse to integer to remove leading zeros, then stringify
  const numericValue = parseInt(digits, 10)
  if (isNaN(numericValue)) return '0,00'
  
  digits = numericValue.toString()
  
  // Pad with leading zeros to ensure at least 3 digits (e.g. 1 -> "001" => "0,01")
  digits = digits.padStart(3, '0')
  
  // Split into integer part and decimal part
  const integerPart = digits.slice(0, -2)
  const decimalPart = digits.slice(-2)
  
  // Add thousand separators
  const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  return `${formattedIntegerPart},${decimalPart}`
}

export function parseCurrencyToNumber(value: string): number {
  if (!value) return 0
  // Remove dots, replace comma with dot
  const cleanStr = value.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleanStr)
  return isNaN(num) ? 0 : num
}
