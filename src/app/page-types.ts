import type { FormEvent } from "react";
import type { Client, Connection, PageId } from "./types";

export type RdpReview = {
  filename: string;
  connection: {
    name: string;
    host: string;
    port: number;
    username?: string;
    display: string;
  };
  warnings: string[];
  unsupportedKeys: string[];
  duplicateConnectionId?: string | null;
};

export type AdapterSupport = {
  id: string;
  label: string;
  available: boolean;
  notes: string;
};
export type Credential = {
  id: string;
  clientId: string;
  label: string;
  username?: string | null;
  domain?: string | null;
};
export type VaultStatus = {
  available: boolean;
  platform: string;
  message: string;
};
export type LaunchHistory = {
  id: number;
  connectionId: string;
  occurredAt: number;
  adapter: string;
  success: boolean;
  category?: string | null;
};

export type ScreenActions = {
  go: (page: PageId) => void;
  createClient: (event: FormEvent<HTMLFormElement>) => void;
  createConnection: (event: FormEvent<HTMLFormElement>) => void;
  editConnection: (event: FormEvent<HTMLFormElement>) => void;
  startConnection: (connection?: Connection) => Promise<void>;
  reviewRdpFile: (file: File) => Promise<void>;
  commitRdpImport: () => Promise<void>;
  exportSelectedConnection: () => Promise<void>;
  toggleSelectedConnectionFavorite: () => void;
  saveCredential: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  copyCredential: (credentialId: string) => Promise<void>;
  createBackup: () => Promise<void>;
  restoreBackup: (file: File) => Promise<void>;
  setSelectedConnection: (connection: Connection) => void;
  setSelectedClientId: (id: string) => void;
  setFormClientId: (id: string) => void;
  setDisplay: (value: string) => void;
  setEditMessage: (value: string) => void;
  setQuery: (value: string) => void;
  setConnectionClientFilter: (value: string) => void;
  setConnectionPage: (value: number) => void;
  setConnectionPageSize: (value: number) => void;
  setCredentialClientId: (value: string) => void;
  setTheme: (value: "g10" | "g100") => void;
};

export type ScreenState = {
  clients: Client[];
  connections: Connection[];
  selectedConnection?: Connection;
  selectedClientId: string;
  formClientId: string;
  selectedClient?: Client;
  selectedCredential?: Credential;
  launching: boolean;
  launchMessage: string;
  importReview?: RdpReview;
  adapterSupport: AdapterSupport[];
  credentials: Credential[];
  vaultStatus?: VaultStatus;
  launchHistory: LaunchHistory[];
  theme: "g10" | "g100";
  credentialMessage: string;
  credentialClientId: string;
  display: string;
  connectionClientFilter: string;
  connectionPage: number;
  connectionPageSize: number;
  editMessage: string;
  backupMessage: string;
  query: string;
};

export type ScreenProps = ScreenState & ScreenActions;
