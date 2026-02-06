"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

const ThemeSwitch = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const handleCheckedChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <SunIcon className="size-4" />
        <Switch disabled />
        <MoonIcon className="size-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SunIcon className="size-4 text-muted-foreground" />
      <Switch checked={isDark} onCheckedChange={handleCheckedChange} />
      <MoonIcon className="size-4 text-muted-foreground" />
    </div>
  );
};

export default ThemeSwitch;
