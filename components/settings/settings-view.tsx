"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Moon,
  Sun,
  Laptop,
  Bell,
  Gauge,
  Mail,
  Save,
  Settings2,
  Loader2,
  CheckCircle,
} from "lucide-react";
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
import { verifyEmail } from "@/app/actions/send-email";

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
  const [isVerifying, setIsVerifying] = useState(false);

  // Check URL parameters for verification status
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("verified") === "true") {
      setNotifications({
        ...settings.notifications,
        emailVerified: true,
      });
      toast.success("Email verified successfully!");
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (searchParams.get("error")) {
      toast.error(searchParams.get("error"));
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [settings.notifications, setNotifications]);

  const handleThemeChange = (newTheme: typeof settings.theme) => {
    setTheme(newTheme);
    setStoreTheme(newTheme);
  };

  const handleEmailToggle = async (enabled: boolean) => {
    setNotifications({ ...settings.notifications, enabled });
    if (enabled && !settings.notifications.email) {
      toast.info("Please enter your email address");
    }
  };

  const handleEmailChange = (email: string) => {
    setNotifications({ ...settings.notifications, email });
  };

  const handleVerifyEmail = async () => {
    if (!settings.notifications.email) {
      toast.error("Please enter an email address");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyEmail(settings.notifications.email);
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send verification email"
      );
    } finally {
      setIsVerifying(false);
    }
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
            <TabsTrigger value="sensor" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Sensor
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
                  <Label>Distance</Label>
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

                <div className="space-y-2">
                  <Label>Gas Level</Label>
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
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                      <SelectItem value="ppm">
                        Parts per Million (ppm)
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
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={settings.notifications.email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        onClick={handleVerifyEmail}
                        disabled={
                          isVerifying ||
                          !settings.notifications.email ||
                          settings.notifications.emailVerified
                        }
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : settings.notifications.emailVerified ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            Verified
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Verify Email
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {settings.notifications.emailVerified
                        ? "Your email is verified and ready to receive notifications"
                        : "You'll need to verify your email address to receive notifications"}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sound Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Play a sound when alerts are triggered
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.audio}
                    onCheckedChange={(audio) =>
                      setNotifications({ ...settings.notifications, audio })
                    }
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="sensor">
            <Card>
              <CardHeader>
                <CardTitle>Sensor Configuration</CardTitle>
                <CardDescription>
                  Configure sensor update interval and other settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Update Interval</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={5}
                      max={3600}
                      value={settings.updateInterval}
                      onChange={(e) =>
                        setUpdateInterval(Number(e.target.value))
                      }
                      className="w-[120px]"
                    />
                    <span className="flex items-center text-sm text-muted-foreground">
                      seconds
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    How often the sensor should send new readings (minimum 5
                    seconds, maximum 1 hour)
                  </p>
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
