import {
  Certificate,
  ConnectionSignal,
  Favorite,
  ImportExport,
  RecentlyViewed,
  Settings,
  UserMultiple,
} from "@carbon/icons-react";
import type { NavigationPage } from "./types";

export const navigation: Array<{
  id: NavigationPage;
  label: string;
  icon: typeof ConnectionSignal;
}> = [
  { id: "connections", label: "All connections", icon: ConnectionSignal },
  { id: "clients", label: "Clients", icon: UserMultiple },
  { id: "favorites", label: "Favorites", icon: Favorite },
  { id: "recent", label: "Recent", icon: RecentlyViewed },
  { id: "import-export", label: "Import and export", icon: ImportExport },
  { id: "credentials", label: "Credentials", icon: Certificate },
  { id: "settings", label: "Settings", icon: Settings },
];

export const pageCopy: Record<
  NavigationPage,
  { title: string; description: string }
> = {
  connections: {
    title: "All connections",
    description: "Find a saved connection by customer, host, username, or tag.",
  },
  clients: {
    title: "Clients",
    description:
      "Keep customer organizations and their connection libraries distinct.",
  },
  favorites: {
    title: "Favorites",
    description: "Your marked connections appear here for fast access.",
  },
  recent: {
    title: "Recent",
    description:
      "Launch history will appear here after a connection is opened.",
  },
  "import-export": {
    title: "Import and export",
    description:
      "Review RDP files before adding them, and export settings without passwords.",
  },
  credentials: {
    title: "Credentials",
    description:
      "Credential references are designed to use your operating system's secure store.",
  },
  settings: {
    title: "Settings",
    description: "Choose an RDP client, appearance, and library preferences.",
  },
};
