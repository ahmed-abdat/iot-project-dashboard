"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/lib/stores/settings-store";

export function UnitSettings() {
  const settings = useSettingsStore((state) => state.settings);
  const setUnits = useSettingsStore((state) => state.setUnits);

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Temperature</label>
        <Select
          value={settings.units.temperature}
          onValueChange={(value: "celsius" | "fahrenheit") =>
            setUnits({ ...settings.units, temperature: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="celsius">Celsius (°C)</SelectItem>
            <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Distance</label>
        <Select
          value={settings.units.distance}
          onValueChange={(value: "cm" | "inches") =>
            setUnits({ ...settings.units, distance: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cm">Centimeters (cm)</SelectItem>
            <SelectItem value="inches">Inches (in)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Gas Level</label>
        <Select
          value={settings.units.gasLevel}
          onValueChange={(value: "ppm" | "percent") =>
            setUnits({ ...settings.units, gasLevel: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ppm">Parts per Million (ppm)</SelectItem>
            <SelectItem value="percent">Percentage (%)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
