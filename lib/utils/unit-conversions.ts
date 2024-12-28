export function convertTemperature(
  value: number,
  to: "celsius" | "fahrenheit"
): number {
  if (to === "fahrenheit") {
    return (value * 9) / 5 + 32;
  }
  return value; // Already in Celsius
}

export function convertPressure(value: number, to: "hPa" | "mmHg"): number {
  if (to === "mmHg") {
    return value * 0.75006; // Convert from hPa to mmHg
  }
  return value; // Already in hPa
}

export function formatTemperature(
  value: number,
  unit: "celsius" | "fahrenheit"
): string {
  const converted = convertTemperature(value, unit);
  return `${converted.toFixed(1)}${unit === "celsius" ? "°C" : "°F"}`;
}

export function formatPressure(value: number, unit: "hPa" | "mmHg"): string {
  const converted = convertPressure(value, unit);
  return `${converted.toFixed(1)} ${unit}`;
}

export function formatHumidity(value: number): string {
  return `${value.toFixed(1)}%`;
}
