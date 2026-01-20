import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">App Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifs">Email Notifications</Label>
            <Switch id="email-notifs" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="app-notifs">App Notifications</Label>
            <Switch id="app-notifs" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode">Dark Mode</Label>
            <Switch id="dark-mode" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
