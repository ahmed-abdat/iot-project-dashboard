"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Laptop, Bell, Gauge, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/page-container";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const settings = useSettingsStore((state) => state.settings);
  const {
    setTheme: setStoreTheme,
    setUnits,
    setNotifications,
    setUpdateInterval,
    saveSettings,
  } = useSettingsStore();

  const [isSaving, setIsSaving] = useState(false);

  const handleThemeChange = (newTheme: typeof settings.theme) => {
    setTheme(newTheme);
    setStoreTheme(newTheme);
  };

  const handleEmailToggle = (enabled: boolean) => {
    setNotifications({ ...settings.notifications, enabled });
    if (enabled) {
      toast.info("Please enter your email address");
    }
  };

  const handleEmailChange = (email: string) => {
    setNotifications({ ...settings.notifications, email });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings();
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer
      title="Settings"
      description="Manage your application preferences"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your application preferences and sensor configuration.
          </p>
        </div>

        <Tabs defaultValue="appearance" className="space-y-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="units" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Units
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how the application looks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="icon"
                      onClick={() => handleThemeChange("light")}
                    >
                      <Sun className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="icon"
                      onClick={() => handleThemeChange("dark")}
                    >
                      <Moon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="icon"
                      onClick={() => handleThemeChange("system")}
                    >
                      <Laptop className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="units">
            <Card>
              <CardHeader>
                <CardTitle>Units</CardTitle>
                <CardDescription>
                  Configure your preferred measurement units
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Temperature</Label>
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
                      <SelectItem value="fahrenheit">
                        Fahrenheit (°F)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pressure</Label>
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
                      <SelectItem value="mmHg">
                        Millimeters of Mercury (mmHg)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Configure how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email alerts when sensor values are out of range
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.enabled}
                    onCheckedChange={handleEmailToggle}
                  />
                </div>

                {settings.notifications.enabled && (
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={settings.notifications.email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Audio Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Play a sound when sensor values are out of range
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.audio}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...settings.notifications,
                        audio: checked,
                      })
                    }
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
