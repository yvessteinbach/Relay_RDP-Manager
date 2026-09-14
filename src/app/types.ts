export type PageId =
  | "connections"
  | "clients"
  | "favorites"
  | "recent"
  | "import-export"
  | "credentials"
  | "settings"
  | "client-form"
  | "client-detail"
  | "connection-form"
  | "connection-edit"
  | "connection-detail";

export type Client = { id: string; name: string; notes: string };

export type Connection = {
  id: string;
  name: string;
  host: string;
  username: string;
  clientId: string;
  favorite: boolean;
  display: string;
  credentialId?: string | null;
  port?: number;
  domain?: string | null;
  notes?: string;
  archived?: boolean;
  tagIds?: string[];
};

export type StoredConnection = Connection & {
  siteId?: string | null;
  folderId?: string | null;
  gatewayId?: string | null;
};

export type NavigationPage = Exclude<
  PageId,
  | "client-form"
  | "client-detail"
  | "connection-form"
  | "connection-edit"
  | "connection-detail"
>;
