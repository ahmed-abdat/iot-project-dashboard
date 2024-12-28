"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { Separator } from "@/components/ui/separator";

export function UnitSettings() {
  const settings = useSettingsStore((state) => state.settings);
  const setUnits = useSettingsStore((state) => state.setUnits);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
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

      <Separator />

      <div className="space-y-2">
        <label className="text-sm font-medium">Pressure</label>
        <Select
          value={settings.units.pressure}
          onValueChange={(value: "hPa" | "mmHg") =>
            setUnits({ ...settings.units, pressure: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hPa">Hectopascal (hPa)</SelectItem>
            <SelectItem value="mmHg">Millimeters of Mercury (mmHg)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
