"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Moon,
  Sun,
  Laptop,
  Save,
  Settings2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const settings = useSettingsStore((state) => state.settings);
  const {
    setTheme: setStoreTheme,
    setUpdateInterval,
    saveSettings,
  } = useSettingsStore();

  const [isSaving, setIsSaving] = useState(false);

  const handleThemeChange = (newTheme: typeof settings.theme) => {
    setTheme(newTheme);
    setStoreTheme(newTheme);
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
        <Tabs defaultValue="appearance" className="space-y-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="sensor" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Motor Sensor
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

          <TabsContent value="sensor">
            <Card>
              <CardHeader>
                <CardTitle>Motor Sensor Configuration</CardTitle>
                <CardDescription>
                  Configure ADXL345 accelerometer update settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Dashboard Refresh Rate</Label>
                    <p className="text-sm text-muted-foreground">
                      Control how often dashboard updates from Firebase
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <Button
                      variant={settings.updateInterval === 0 ? "default" : "outline"}
                      className="justify-start h-auto py-3"
                      onClick={() => setUpdateInterval(0)}
                    >
                      <div className="text-left">
                        <div className="font-medium">Real-time (Live)</div>
                        <div className="text-xs text-muted-foreground">
                          Always on, updates instantly
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant={settings.updateInterval === 5 ? "default" : "outline"}
                      className="justify-start h-auto py-3"
                      onClick={() => setUpdateInterval(5)}
                    >
                      <div className="text-left">
                        <div className="font-medium">Fast (5 seconds)</div>
                        <div className="text-xs text-muted-foreground">
                          Good balance of freshness and performance
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant={settings.updateInterval === 30 ? "default" : "outline"}
                      className="justify-start h-auto py-3"
                      onClick={() => setUpdateInterval(30)}
                    >
                      <div className="text-left">
                        <div className="font-medium">Moderate (30 seconds)</div>
                        <div className="text-xs text-muted-foreground">
                          Lower data usage, still responsive
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant={settings.updateInterval === 300 ? "default" : "outline"}
                      className="justify-start h-auto py-3"
                      onClick={() => setUpdateInterval(300)}
                    >
                      <div className="text-left">
                        <div className="font-medium">Low (5 minutes)</div>
                        <div className="text-xs text-muted-foreground">
                          Minimal resource usage
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
