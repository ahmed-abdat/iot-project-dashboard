export function convertTemperature(
  value: number,
  to: "celsius" | "fahrenheit"
): number {
  if (to === "fahrenheit") {
    return (value * 9) / 5 + 32;
  }
  return value; // Already in Celsius
}

export function convertDistance(value: number, to: "cm" | "inches"): number {
  if (to === "inches") {
    return value * 0.393701; // Convert from cm to inches
  }
  return value; // Already in cm
}

export function convertGasLevel(value: number, to: "ppm" | "percent"): number {
  if (to === "percent") {
    return value / 10000; // Convert from ppm to percentage (10000 ppm = 1%)
  }
  return value; // Already in ppm
}

export function formatTemperature(
  value: number,
  unit: "celsius" | "fahrenheit"
): string {
  const converted = convertTemperature(value, unit);
  return `${converted.toFixed(1)}${unit === "celsius" ? "°C" : "°F"}`;
}

export function formatDistance(value: number, unit: "cm" | "inches"): string {
  const converted = convertDistance(value, unit);
  return `${converted.toFixed(1)} ${unit}`;
}

export function formatGasLevel(value: number, unit: "ppm" | "percent"): string {
  const converted = convertGasLevel(value, unit);
  if (unit === "percent") {
    return `${converted.toFixed(3)}%`; // More precision for percentage
  }
  return `${converted.toFixed(0)} ppm`; // Whole numbers for ppm
}

export function formatHumidity(value: number): string {
  return `${value.toFixed(1)}%`;
}
