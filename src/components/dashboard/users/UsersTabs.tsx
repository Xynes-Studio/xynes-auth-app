"use client";

import { Tabs, TabsList, TabsTrigger } from "@lumia-ui/components";

type UsersTabsProps = {
  activeTab: "users" | "teams";
  onTabChange: (tab: "users" | "teams") => void;
};

export function UsersTabs({ activeTab, onTabChange }: UsersTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(nextValue) =>
        onTabChange(nextValue === "teams" ? "teams" : "users")
      }
      className="w-full sm:w-auto"
    >
      <TabsList className="w-full justify-start rounded-[6px] bg-muted p-[5px] sm:w-auto">
        <TabsTrigger
          value="users"
          className="rounded-[3px] px-3 py-1.5 text-[14px] font-medium leading-5 text-muted-foreground hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
        >
          Users
        </TabsTrigger>
        <TabsTrigger
          value="teams"
          className="rounded-[3px] px-3 py-1.5 text-[14px] font-medium leading-5 text-muted-foreground hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
        >
          Teams
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
