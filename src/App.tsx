import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getVersion,
  setTheme as setApplicationTheme,
} from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import {
  Button,
  ButtonSet,
  Checkbox,
  ClickableTile,
  Column,
  Content,
  DataTable,
  Dropdown,
  FileUploaderButton,
  FeatureFlags,
  Grid,
  Header,
  HeaderName,
  InlineLoading,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  Search,
  SideNav,
  SideNavItems,
  SideNavLink,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TextArea,
  TextInput,
  Theme,
  Tile,
} from "@carbon/react";
import {
  Add,
  Copy,
  ConnectionSignal,
  Edit,
  Favorite,
  FavoriteFilled,
  RecentlyViewed,
  UserMultiple,
} from "@carbon/icons-react";
import { navigation, pageCopy } from "./app/navigation";
import type {
  Client,
  Connection,
  NavigationPage,
  PageId,
  StoredConnection,
} from "./app/types";
import { ContextStrip } from "./components/ContextStrip";
import {
  ClientDetailPage,
  ClientFormPage,
  ClientsPage,
} from "./pages/ClientsPage";
import {
  ConnectionDetailPage,
  ConnectionEditPage,
  ConnectionFormPage,
} from "./pages/ConnectionPages";
import { ConnectionsPage } from "./pages/ConnectionsPage";
type RdpReview = {
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
type AdapterSupport = {
  id: string;
  label: string;
  available: boolean;
  notes: string;
};
type Credential = {
  id: string;
  clientId: string;
  label: string;
  username?: string | null;
  domain?: string | null;
};
type VaultStatus = { available: boolean; platform: string; message: string };
type BackupArchive = {
  formatVersion: number;
  createdAt: number;
  checksum: string;
  data: unknown;
};
type RestoreResult = {
  safetyBackup: BackupArchive;
  restoredConnections: number;
  credentialPasswordsRestored: boolean;
};
type LaunchHistory = {
  id: number;
  connectionId: string;
  occurredAt: number;
  adapter: string;
  success: boolean;
  category?: string | null;
};
type UpdateCheck = {
  status:
    | "idle"
    | "checking"
    | "available"
    | "downloading"
    | "installed"
    | "upToDate"
    | "error";
  latestVersion?: string;
  update?: Update;
  errorMessage?: string;
};
type UpdateProgress = { downloaded: number; total?: number };

const FALLBACK_VERSION = "0.1.0";
const THEME_STORAGE_KEY = "relay.theme";

const getStoredTheme = (): "g10" | "g100" =>
  window.localStorage.getItem(THEME_STORAGE_KEY) === "g100" ? "g100" : "g10";

const formatDownloadSize = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const formatRdpImportExclusions = (review: RdpReview) => {
  const parts = [
    review.warnings.length
      ? `${review.warnings.length} sensitive setting${
          review.warnings.length === 1 ? " was" : "s were"
        } excluded`
      : "",
    review.unsupportedKeys.length
      ? `${review.unsupportedKeys.length} client-specific setting${
          review.unsupportedKeys.length === 1 ? " was" : "s were"
        } not imported`
      : "",
  ].filter(Boolean);

  return `Relay imported only the connection target, account, and display choice. ${parts.join("; ")}.`;
};

const updateCheckErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/404|not found|release.*(missing|available)|no.*release/i.test(message)) {
    return "No published Relay release is available yet. Publish the first signed release, then check again.";
  }
  return "Relay could not reach or read its signed release feed. Check your internet connection and try again.";
};

function App() {
  const [activePage, setActivePage] = useState<PageId>("connections");
  const [clients, setClients] = useState<Client[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [query, setQuery] = useState("");
  const [selectedConnection, setSelectedConnection] = useState<Connection>();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState("");
  const [importReview, setImportReview] = useState<RdpReview>();
  const [adapterSupport, setAdapterSupport] = useState<AdapterSupport[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>();
  const [launchHistory, setLaunchHistory] = useState<LaunchHistory[]>([]);
  const [recentPage, setRecentPage] = useState(1);
  const [recentPageSize, setRecentPageSize] = useState(10);
  const [theme, setTheme] = useState<"g10" | "g100">(getStoredTheme);
  const [credentialMessage, setCredentialMessage] = useState("");
  const [credentialClientId, setCredentialClientId] = useState("");
  const [display, setDisplay] = useState("Use RDP client default");
  const [connectionClientFilter, setConnectionClientFilter] =
    useState("All clients");
  const [connectionPage, setConnectionPage] = useState(1);
  const [connectionPageSize, setConnectionPageSize] = useState(10);
  const [editMessage, setEditMessage] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [appVersion, setAppVersion] = useState(FALLBACK_VERSION);
  const [updateCheck, setUpdateCheck] = useState<UpdateCheck>({
    status: "idle",
  });
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress>();
  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    // Tauri applies this to the native window frame, including the macOS title bar.
    void setApplicationTheme(theme === "g100" ? "dark" : "light").catch(
      () => undefined,
    );
  }, [theme]);
  useEffect(() => {
    void getVersion()
      .then(setAppVersion)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const [storedClients, storedConnections] = await Promise.all([
          invoke<Client[]>("list_clients"),
          invoke<StoredConnection[]>("list_connections", {
            query: { text: "", includeArchived: false },
          }),
        ]);
        setClients(storedClients);
        setConnections(
          storedConnections.map((connection) => ({
            ...connection,
            username: connection.username ?? "",
            display: connection.display || "Use RDP client default",
          })),
        );
        setAdapterSupport(await invoke<AdapterSupport[]>("adapter_support"));
        setCredentials(
          await invoke<Credential[]>("list_credentials", { clientId: null }),
        );
        setVaultStatus(await invoke<VaultStatus>("credential_store_status"));
        setLaunchHistory(
          await invoke<LaunchHistory[]>("list_launch_history", {
            connectionId: null,
          }),
        );
      } catch {
        // The browser prototype deliberately remains usable without Tauri.
      }
    };
    void loadLibrary();
  }, []);
  const selectedClient = clients.find(
    (client) => client.id === (selectedConnection?.clientId ?? formClientId),
  );
  const selectedCredential = credentials.find(
    (credential) => credential.id === selectedConnection?.credentialId,
  );
  const visibleConnections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return connections.filter(
      (connection) =>
        !needle ||
        [
          connection.name,
          connection.host,
          connection.username,
          clients.find((client) => client.id === connection.clientId)?.name ??
            "",
        ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [clients, connections, query]);
  const go = (page: PageId) => {
    setActivePage(page);
    setQuery("");
    setConnectionPage(1);
  };
  const downloadBackup = (archive: BackupArchive, prefix = "relay-backup") => {
    const blob = new Blob([JSON.stringify(archive, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${prefix}-${new Date(archive.createdAt * 1000)
      .toISOString()
      .slice(0, 10)}.relay-backup.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const createBackup = async () => {
    try {
      const archive = await invoke<BackupArchive>("create_backup");
      downloadBackup(archive);
      setBackupMessage(
        "Backup downloaded. It excludes passwords stored by your operating system.",
      );
    } catch {
      setBackupMessage(
        "Relay could not create a backup. Run this from the desktop application and try again.",
      );
    }
  };
  const checkForUpdates = async () => {
    setUpdateCheck({ status: "checking" });
    setUpdateProgress(undefined);
    try {
      const update = await check();
      setUpdateCheck(
        update
          ? { status: "available", latestVersion: update.version, update }
          : { status: "upToDate" },
      );
    } catch (error) {
      setUpdateCheck({
        status: "error",
        errorMessage: updateCheckErrorMessage(error),
      });
    }
  };
  const installUpdate = async () => {
    const update = updateCheck.update;
    if (!update) return;

    setUpdateCheck({
      status: "downloading",
      latestVersion: updateCheck.latestVersion,
    });
    setUpdateProgress({ downloaded: 0 });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          setUpdateProgress({
            downloaded: 0,
            total: event.data.contentLength,
          });
        }
        if (event.event === "Progress") {
          setUpdateProgress((progress) => ({
            downloaded: (progress?.downloaded ?? 0) + event.data.chunkLength,
            total: progress?.total,
          }));
        }
      });
      setUpdateCheck({
        status: "installed",
        latestVersion: updateCheck.latestVersion,
      });
    } catch {
      setUpdateCheck({
        status: "error",
        errorMessage:
          "Relay could not download or install this signed update. Please try again.",
      });
    } finally {
      await update.close();
    }
  };
  const restoreBackup = async (file: File) => {
    try {
      const archive = JSON.parse(await file.text()) as BackupArchive;
      const result = await invoke<RestoreResult>("restore_backup", { archive });
      downloadBackup(result.safetyBackup, "relay-pre-restore-safety-backup");
      const [storedClients, storedConnections] = await Promise.all([
        invoke<Client[]>("list_clients"),
        invoke<StoredConnection[]>("list_connections", {
          query: { text: "", includeArchived: false },
        }),
      ]);
      setClients(storedClients);
      setConnections(
        storedConnections.map((connection) => ({
          ...connection,
          username: connection.username ?? "",
          display: connection.display || "Use RDP client default",
        })),
      );
      setBackupMessage(
        `Restore complete: ${result.restoredConnections} connection${result.restoredConnections === 1 ? "" : "s"}. A pre-restore safety backup was downloaded. Passwords were not restored; enter them again if needed.`,
      );
    } catch {
      setBackupMessage(
        "Restore was not applied. Check that this is an unmodified Relay backup and try again.",
      );
    }
  };
  const createClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const client = {
      id: crypto.randomUUID(),
      name: String(form.get("name")).trim(),
      notes: String(form.get("notes")).trim(),
    };
    if (!client.name) return;
    setClients((current) => [...current, client]);
    void invoke("save_client", { client }).catch(() => undefined);
    setFormClientId(client.id);
    go("clients");
  };
  const createConnection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const connectionId = crypto.randomUUID();
    const credentialId = password ? crypto.randomUUID() : null;
    const connectionName = String(form.get("connectionName")).trim();
    const username = String(form.get("username")).trim();
    const connection = {
      id: connectionId,
      name: connectionName,
      host: String(form.get("host")).trim(),
      username,
      clientId: formClientId,
      favorite: Boolean(form.get("favorite")),
      display,
      credentialId,
    };
    if (!connection.name || !connection.host || !connection.clientId) return;
    try {
      if (credentialId) {
        const credential = await invoke<Credential>("save_credential", {
          item: {
            id: credentialId,
            clientId: connection.clientId,
            label: `${connection.name} password`,
            username: username || null,
            domain: null,
            password,
            archived: false,
          },
        });
        setCredentials((current) => [...current, credential]);
      }
      const connectionPayload = {
        item: {
          ...connection,
          port: 3389,
          siteId: null,
          folderId: null,
          gatewayId: null,
          credentialId,
          domain: null,
          notes: "",
          archived: false,
          tagIds: [],
        },
      };
      if (credentialId) await invoke("save_connection", connectionPayload);
      else
        void invoke("save_connection", connectionPayload).catch(
          () => undefined,
        );
      setConnections((current) => [...current, connection]);
      setSelectedConnection(connection);
      setLaunchMessage(
        credentialId
          ? "Connection and password saved securely."
          : "Connection saved.",
      );
      go("connection-detail");
    } catch {
      setLaunchMessage(
        password
          ? "Relay could not save the password in your operating system credential store. The connection was not created."
          : "Relay could not save this connection.",
      );
    }
  };
  const editConnection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConnection) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const connection = {
      ...selectedConnection,
      name: String(form.get("connectionName")).trim(),
      host: String(form.get("host")).trim(),
      username: String(form.get("username")).trim(),
      display,
    };
    if (!connection.name || !connection.host) return;
    try {
      let credentialId = connection.credentialId ?? null;
      if (password) {
        credentialId ??= crypto.randomUUID();
        const credential = await invoke<Credential>("save_credential", {
          item: {
            id: credentialId,
            clientId: connection.clientId,
            label: `${connection.name} password`,
            username: connection.username || null,
            domain: connection.domain ?? null,
            password,
            archived: false,
          },
        });
        setCredentials((current) => [
          ...current.filter((item) => item.id !== credential.id),
          credential,
        ]);
      }
      const updatedConnection = { ...connection, credentialId };
      const connectionPayload = {
        item: {
          ...updatedConnection,
          port: updatedConnection.port ?? 3389,
          siteId: null,
          folderId: null,
          gatewayId: null,
          domain: updatedConnection.domain ?? null,
          notes: updatedConnection.notes ?? "",
          archived: updatedConnection.archived ?? false,
          tagIds: updatedConnection.tagIds ?? [],
        },
      };
      if (password) await invoke("save_connection", connectionPayload);
      else
        void invoke("save_connection", connectionPayload).catch(
          () => undefined,
        );
      setConnections((current) =>
        current.map((item) =>
          item.id === updatedConnection.id ? updatedConnection : item,
        ),
      );
      setSelectedConnection(updatedConnection);
      setLaunchMessage("Connection updated.");
      setEditMessage("");
      go("connection-detail");
    } catch {
      setEditMessage(
        password
          ? "Relay could not update the password in your operating system credential store."
          : "Relay could not save these connection changes.",
      );
    }
  };
  const startConnection = async (connection = selectedConnection) => {
    if (!connection) return;
    setLaunching(true);
    setLaunchMessage("");
    try {
      const result = await invoke<{ message: string }>("launch_connection", {
        connectionId: connection.id,
      });
      setLaunchMessage(result.message);
    } catch {
      setLaunchMessage(
        "No supported RDP client is available. Choose or install one, then try again.",
      );
    } finally {
      setLaunching(false);
      void invoke<LaunchHistory[]>("list_launch_history", {
        connectionId: null,
      })
        .then(setLaunchHistory)
        .catch(() => undefined);
    }
  };
  const reviewRdpFile = async (file: File) => {
    if (!formClientId && !clients[0]) return;
    try {
      const review = await invoke<RdpReview>("review_rdp_import", {
        input: {
          filename: file.name,
          content: await file.text(),
          clientId: formClientId || clients[0].id,
        },
      });
      setImportReview(review);
    } catch {
      setImportReview(undefined);
    }
  };
  const commitRdpImport = async () => {
    if (!importReview) return;
    const clientId = formClientId || clients[0]?.id;
    if (!clientId) return;
    const item = {
      id: crypto.randomUUID(),
      clientId,
      siteId: null,
      folderId: null,
      gatewayId: null,
      name: importReview.connection.name,
      host: importReview.connection.host,
      port: importReview.connection.port,
      username: importReview.connection.username ?? null,
      domain: null,
      display: importReview.connection.display,
      notes: "",
      favorite: false,
      archived: false,
      tagIds: [],
    };
    await invoke("commit_rdp_import", {
      commit: {
        connection: item,
        replaceConnectionId: importReview.duplicateConnectionId ?? null,
      },
    });
    const displayConnection: Connection = {
      ...item,
      username: item.username ?? "",
    };
    setConnections((current) => [
      ...current.filter(
        (connection) => connection.id !== importReview.duplicateConnectionId,
      ),
      displayConnection,
    ]);
    setImportReview(undefined);
    setSelectedConnection(displayConnection);
    go("connection-detail");
  };
  const exportSelectedConnection = async () => {
    if (!selectedConnection) return;
    try {
      const content = await invoke<string>("export_rdp", {
        connectionId: selectedConnection.id,
      });
      const url = URL.createObjectURL(
        new Blob([content], { type: "application/x-rdp" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedConnection.name}.rdp`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setLaunchMessage("Relay could not export this connection.");
    }
  };
  const toggleSelectedConnectionFavorite = () => {
    if (!selectedConnection) return;
    const updatedConnection = {
      ...selectedConnection,
      favorite: !selectedConnection.favorite,
    };
    setConnections((current) =>
      current.map((connection) =>
        connection.id === updatedConnection.id ? updatedConnection : connection,
      ),
    );
    setSelectedConnection(updatedConnection);
    void invoke("set_connection_favorite", {
      id: updatedConnection.id,
      favorite: updatedConnection.favorite,
    }).catch(() => undefined);
  };
  const saveCredential = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const clientId = credentialClientId || clients[0]?.id;
    if (!clientId) return;
    try {
      const credential = await invoke<Credential>("save_credential", {
        item: {
          id: crypto.randomUUID(),
          clientId,
          label: String(form.get("credentialLabel")).trim(),
          username: String(form.get("credentialUsername")).trim() || null,
          domain: String(form.get("credentialDomain")).trim() || null,
          password: String(form.get("credentialPassword")),
          archived: false,
        },
      });
      setCredentials((items) => [...items, credential]);
      setCredentialMessage(
        "Credential saved in the operating system credential store.",
      );
      event.currentTarget.reset();
    } catch {
      setCredentialMessage(
        "Relay could not save this credential. Check that your system credential store is available.",
      );
    }
  };
  const copyCredential = async (credentialId: string) => {
    try {
      const password = await invoke<string>("reveal_credential", {
        credentialId,
      });
      await navigator.clipboard.writeText(password);
      window.setTimeout(() => void navigator.clipboard.writeText(""), 30_000);
      setCredentialMessage(
        "Password copied. Relay will clear the clipboard in 30 seconds.",
      );
    } catch {
      setCredentialMessage("Relay could not reveal or copy this password.");
    }
  };
  const connectionTable = (items: Connection[]) =>
    items.length ? (
      <DataTable
        rows={items.map((connection) => ({
          id: connection.id,
          name: connection.name,
          client:
            clients.find((client) => client.id === connection.clientId)?.name ??
            "Unknown client",
          host: connection.host,
          username: connection.username || "Not set",
        }))}
        headers={[
          { key: "name", header: "Connection" },
          { key: "client", header: "Client" },
          { key: "host", header: "Host" },
          { key: "username", header: "Username" },
          { key: "actions", header: "Actions" },
        ]}
        isSortable
      >
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()} aria-label="Saved connections">
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader
                      {...getHeaderProps({ header })}
                      isSortable={header.key !== "actions"}
                    >
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const connection = items.find((item) => item.id === row.id);
                  if (!connection) return null;
                  return (
                    <TableRow
                      {...getRowProps({ row })}
                      className="relay-connection-row"
                      tabIndex={0}
                      aria-label={`Open ${connection.name}`}
                      onClick={() => {
                        setSelectedConnection(connection);
                        go("connection-detail");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedConnection(connection);
                          go("connection-detail");
                        }
                      }}
                    >
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>
                          {cell.info.header === "actions" ? (
                            <div className="relay-table-actions">
                              <Button
                                size="sm"
                                renderIcon={ConnectionSignal}
                                disabled={launching}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedConnection(connection);
                                  void startConnection(connection);
                                }}
                              >
                                Connect
                              </Button>
                              <Button
                                kind="ghost"
                                size="sm"
                                renderIcon={Edit}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedConnection(connection);
                                  setDisplay(
                                    connection.display ||
                                      "Use RDP client default",
                                  );
                                  setEditMessage("");
                                  go("connection-edit");
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                          ) : (
                            cell.value
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    ) : (
      <Tile className="relay-empty-state">
        <Stack gap={6}>
          <ConnectionSignal size={48} aria-hidden="true" />
          <Stack gap={3}>
            <h2 className="cds--heading-04">No saved connections</h2>
            <p className="cds--body-01">
              Start by creating a client organization, then add the first
              connection.
            </p>
          </Stack>
          <div>
            <Button
              renderIcon={Add}
              onClick={() =>
                go(clients.length ? "connection-form" : "client-form")
              }
            >
              {clients.length ? "Add connection" : "Create client"}
            </Button>
          </div>
        </Stack>
      </Tile>
    );
  const renderPage = () => {
    const screenProps = {
      clients,
      connections,
      selectedConnection,
      selectedClientId,
      formClientId,
      selectedClient,
      selectedCredential,
      launching,
      launchMessage,
      importReview,
      adapterSupport,
      credentials,
      vaultStatus,
      launchHistory,
      theme,
      credentialMessage,
      credentialClientId,
      display,
      connectionClientFilter,
      connectionPage,
      connectionPageSize,
      editMessage,
      backupMessage,
      query,
      go,
      createClient,
      createConnection,
      editConnection,
      startConnection,
      reviewRdpFile,
      commitRdpImport,
      exportSelectedConnection,
      toggleSelectedConnectionFavorite,
      saveCredential,
      copyCredential,
      createBackup,
      restoreBackup,
      setSelectedConnection,
      setSelectedClientId,
      setFormClientId,
      setDisplay,
      setEditMessage,
      setQuery,
      setConnectionClientFilter,
      setConnectionPage,
      setConnectionPageSize,
      setCredentialClientId,
      setTheme,
    };
    if (activePage === "client-form")
      return <ClientFormPage {...screenProps} />;
    if (activePage === "client-detail")
      return <ClientDetailPage {...screenProps} />;
    if (activePage === "clients") return <ClientsPage {...screenProps} />;
    if (activePage === "connection-form")
      return <ConnectionFormPage {...screenProps} />;
    if (activePage === "connection-edit")
      return <ConnectionEditPage {...screenProps} />;
    if (activePage === "connection-detail")
      return <ConnectionDetailPage {...screenProps} />;
    if (activePage === "connections" || activePage === "favorites")
      return <ConnectionsPage {...screenProps} mode={activePage} />;
    const legacyActivePage = activePage as PageId;
    if (legacyActivePage === "client-form")
      return (
        <>
          <ContextStrip />
          <div className="relay-page-heading">
            <p className="cds--label-01">Client library</p>
            <h1 className="cds--heading-06">Create client</h1>
            <p className="cds--body-02 relay-page-description">
              Add the customer organization before saving its connections.
            </p>
          </div>
          <form
            key="client-form"
            className="relay-form"
            onSubmit={createClient}
          >
            <TextInput
              id="client-name"
              name="name"
              labelText="Client name"
              helperText="The customer organization shown throughout Relay."
              required
            />
            <TextArea
              id="client-notes"
              name="notes"
              labelText="Notes"
              enableCounter
              maxCount={500}
            />
            <ButtonSet>
              <Button
                kind="secondary"
                type="button"
                onClick={() => go("clients")}
              >
                Cancel
              </Button>
              <Button
                kind="secondary"
                type="submit"
                name="afterSave"
                value="clients"
              >
                Skip for now
              </Button>
              <Button type="submit">Save and add connection</Button>
            </ButtonSet>
          </form>
        </>
      );
    if (legacyActivePage === "client-detail") {
      const client = clients.find((item) => item.id === selectedClientId);
      if (!client) return null;
      const clientConnections = connections.filter(
        (connection) => connection.clientId === client.id,
      );
      return (
        <section className="relay-list-page" aria-labelledby="page-title">
          <div className="relay-detail-heading">
            <div className="relay-page-heading">
              <p className="cds--label-01">Client library</p>
              <h1 id="page-title" className="cds--heading-06">
                {client.name}
              </h1>
              <p className="cds--body-02 relay-page-description">
                {clientConnections.length} saved connection
                {clientConnections.length === 1 ? "" : "s"} for this client.
              </p>
            </div>
            <div className="relay-detail-actions">
              <Button kind="secondary" onClick={() => go("clients")}>
                Back to clients
              </Button>
              <Button
                renderIcon={Add}
                onClick={() => {
                  setFormClientId(client.id);
                  go("connection-form");
                }}
              >
                Add connection
              </Button>
            </div>
          </div>
          <div className="relay-table">
            {clientConnections.length ? (
              connectionTable(clientConnections)
            ) : (
              <Tile className="relay-empty-state">
                <Stack gap={5}>
                  <ConnectionSignal size={48} aria-hidden="true" />
                  <h2 className="cds--heading-04">No saved connections</h2>
                  <Button
                    renderIcon={Add}
                    onClick={() => {
                      setFormClientId(client.id);
                      go("connection-form");
                    }}
                  >
                    Add connection
                  </Button>
                </Stack>
              </Tile>
            )}
          </div>
        </section>
      );
    }
    if (legacyActivePage === "connection-form")
      return (
        <>
          <ContextStrip
            client={clients.find((client) => client.id === formClientId)}
          />
          <div className="relay-page-heading">
            <p className="cds--label-01">Connection details</p>
            <h1 className="cds--heading-06">Add connection</h1>
            <p className="cds--body-02 relay-page-description">
              Save the server details and, if needed, its password in one step.
            </p>
          </div>
          <form
            key="connection-form"
            className="relay-form"
            onSubmit={createConnection}
          >
            <TextInput
              id="connection-name"
              name="connectionName"
              labelText="Connection name"
              required
            />
            <TextInput
              id="connection-host"
              name="host"
              labelText="Host or IP address"
              required
            />
            <TextInput
              id="connection-username"
              name="username"
              labelText="Username"
            />
            <TextInput
              id="connection-password"
              name="password"
              type="password"
              labelText="Password"
              helperText="Optional. Relay saves it in your operating system credential store, not in this connection or its RDP export."
              autoComplete="new-password"
            />
            <Dropdown
              id="connection-display"
              titleText="Display"
              label="Select a display setting"
              items={["Windowed", "Full screen", "Use RDP client default"]}
              initialSelectedItem="Use RDP client default"
              onChange={({ selectedItem }) => setDisplay(String(selectedItem))}
            />
            <Checkbox
              id="favorite"
              name="favorite"
              labelText="Add to favorites"
            />
            <ButtonSet>
              <Button
                kind="secondary"
                type="button"
                onClick={() => go("connections")}
              >
                Cancel
              </Button>
              <Button type="submit">Save connection</Button>
            </ButtonSet>
            {launchMessage ? (
              <InlineNotification
                hideCloseButton
                lowContrast
                kind="error"
                title="Could not save connection"
                subtitle={launchMessage}
              />
            ) : null}
          </form>
        </>
      );
    if (legacyActivePage === "connection-edit" && selectedConnection)
      return (
        <>
          <ContextStrip
            connection={selectedConnection}
            client={selectedClient}
          />
          <div className="relay-detail-heading">
            <div className="relay-page-heading">
              <p className="cds--label-01">Connection details</p>
              <h1 className="cds--heading-06">Edit connection</h1>
              <p className="cds--body-02 relay-page-description">
                Update the server address, sign-in name, password, or display
                preference for {selectedConnection.name}.
              </p>
            </div>
          </div>
          <form className="relay-form" onSubmit={editConnection}>
            <TextInput
              id="edit-connection-name"
              name="connectionName"
              labelText="Connection name"
              defaultValue={selectedConnection.name}
              required
            />
            <TextInput
              id="edit-connection-host"
              name="host"
              labelText="Host or IP address"
              defaultValue={selectedConnection.host}
              required
            />
            <TextInput
              id="edit-connection-username"
              name="username"
              labelText="Username"
              defaultValue={selectedConnection.username}
            />
            <TextInput
              id="edit-connection-password"
              name="password"
              type="password"
              labelText="New password"
              helperText="Leave blank to keep the current password. A new password is saved in your operating system credential store."
              autoComplete="new-password"
            />
            <Dropdown
              id="edit-connection-display"
              titleText="Display"
              label="Select a display setting"
              items={["Windowed", "Full screen", "Use RDP client default"]}
              selectedItem={display}
              onChange={({ selectedItem }) => setDisplay(String(selectedItem))}
            />
            <ButtonSet>
              <Button
                kind="secondary"
                type="button"
                onClick={() => go("connection-detail")}
              >
                Cancel
              </Button>
              <Button type="submit">Save changes</Button>
            </ButtonSet>
            {editMessage ? (
              <InlineNotification
                hideCloseButton
                lowContrast
                kind="error"
                title="Could not update connection"
                subtitle={editMessage}
              />
            ) : null}
          </form>
        </>
      );
    if (legacyActivePage === "connection-detail" && selectedConnection)
      return (
        <>
          <ContextStrip
            connection={selectedConnection}
            client={selectedClient}
          />
          <div className="relay-detail-heading">
            <div>
              <p className="cds--label-01">Connection</p>
              <h1
                className="cds--heading-06"
                aria-label={selectedConnection.name}
              >
                {selectedConnection.name}
              </h1>
              <p className="cds--body-02 relay-page-description">
                {selectedConnection.host}
                {selectedConnection.username
                  ? ` · ${selectedConnection.username}`
                  : ""}
              </p>
            </div>
            <div className="relay-detail-actions">
              <Button
                kind="ghost"
                renderIcon={
                  selectedConnection.favorite ? FavoriteFilled : Favorite
                }
                onClick={toggleSelectedConnectionFavorite}
              >
                {selectedConnection.favorite
                  ? "Remove from favorites"
                  : "Add to favorites"}
              </Button>
              <Button
                renderIcon={ConnectionSignal}
                onClick={() => void startConnection()}
                disabled={launching}
              >
                {launching ? "Preparing connection" : "Connect"}
              </Button>
              <OverflowMenu
                aria-label="Connection actions"
                iconDescription="Connection actions"
                flipped
              >
                <OverflowMenuItem
                  itemText="Edit"
                  onClick={() => {
                    setDisplay(
                      selectedConnection.display || "Use RDP client default",
                    );
                    setEditMessage("");
                    go("connection-edit");
                  }}
                />
                <OverflowMenuItem
                  itemText="Export RDP"
                  onClick={exportSelectedConnection}
                />
              </OverflowMenu>
            </div>
          </div>
          {launching ? (
            <InlineLoading description="Starting the selected RDP client…" />
          ) : null}
          {launchMessage ? (
            <InlineNotification
              hideCloseButton
              lowContrast
              kind="info"
              title="Connection launch"
              subtitle={launchMessage}
            />
          ) : null}
          <div className="relay-detail-tabs">
            <Tabs>
              <TabList aria-label="Connection sections">
                <Tab>Overview</Tab>
                <Tab>Display and resources</Tab>
                <Tab>Security</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <Tile>
                    <dl className="relay-definition-list">
                      <div>
                        <dt>Client</dt>
                        <dd>{selectedClient?.name}</dd>
                      </div>
                      <div>
                        <dt>Host</dt>
                        <dd>{selectedConnection.host}</dd>
                      </div>
                      <div>
                        <dt>Username</dt>
                        <dd>{selectedConnection.username || "Not set"}</dd>
                      </div>
                      <div>
                        <dt>Display</dt>
                        <dd>
                          {selectedConnection.display ||
                            "Use RDP client default"}
                        </dd>
                      </div>
                    </dl>
                  </Tile>
                </TabPanel>
                <TabPanel>
                  <InlineNotification
                    lowContrast
                    hideCloseButton
                    kind="info"
                    title="Adapter support"
                    subtitle={
                      adapterSupport
                        .filter((adapter) => adapter.available)
                        .map((adapter) => adapter.notes)
                        .join(" ") ||
                      "No supported RDP client is currently available on this computer."
                    }
                  />
                </TabPanel>
                <TabPanel>
                  <Stack gap={5}>
                    <InlineNotification
                      lowContrast
                      hideCloseButton
                      kind={vaultStatus?.available ? "success" : "warning"}
                      title="Credential store"
                      subtitle={
                        vaultStatus?.message ??
                        "Credential store status is unavailable outside the desktop app."
                      }
                    />
                    <Tile>
                      <Stack gap={5}>
                        <dl className="relay-definition-list">
                          <div>
                            <dt>Password</dt>
                            <dd>
                              {selectedConnection.credentialId
                                ? "Saved securely"
                                : "Not saved"}
                            </dd>
                          </div>
                          <div>
                            <dt>Credential</dt>
                            <dd>
                              {selectedCredential?.label ??
                                (selectedConnection.credentialId
                                  ? "Saved credential"
                                  : "None")}
                            </dd>
                          </div>
                          <div>
                            <dt>Username</dt>
                            <dd>{selectedConnection.username || "Not set"}</dd>
                          </div>
                        </dl>
                        <div>
                          <Button
                            kind="secondary"
                            renderIcon={Edit}
                            onClick={() => {
                              setDisplay(
                                selectedConnection.display ||
                                  "Use RDP client default",
                              );
                              setEditMessage("");
                              go("connection-edit");
                            }}
                          >
                            {selectedConnection.credentialId
                              ? "Change password"
                              : "Set password"}
                          </Button>
                        </div>
                      </Stack>
                    </Tile>
                  </Stack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </div>
        </>
      );
    const page = pageCopy[legacyActivePage as NavigationPage];
    if (
      legacyActivePage === "connections" ||
      legacyActivePage === "favorites"
    ) {
      const rows =
        legacyActivePage === "favorites"
          ? visibleConnections.filter((connection) => connection.favorite)
          : visibleConnections.filter(
              (connection) =>
                connectionClientFilter === "All clients" ||
                connection.clientId === connectionClientFilter,
            );
      const pagedRows = rows.slice(
        (connectionPage - 1) * connectionPageSize,
        connectionPage * connectionPageSize,
      );
      return (
        <section className="relay-list-page" aria-labelledby="page-title">
          <div className="relay-detail-heading">
            <div className="relay-page-heading">
              <p className="cds--label-01">Relay library</p>
              <h1 id="page-title" className="cds--heading-06">
                {page.title}
              </h1>
              <p className="cds--body-02 relay-page-description">
                {page.description}
              </p>
            </div>
            <Button
              renderIcon={Add}
              onClick={() =>
                go(clients.length ? "connection-form" : "client-form")
              }
            >
              Add connection
            </Button>
          </div>
          {connections.length ? (
            <div className="relay-list-body">
              <Search
                id="connection-search"
                labelText="Search connections"
                placeholder="Search connections"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
              <Dropdown
                id="connection-client-filter"
                titleText="Client"
                label="All clients"
                items={[
                  { id: "All clients", label: "All clients" },
                  ...clients.map((client) => ({
                    id: client.id,
                    label: client.name,
                  })),
                ]}
                itemToString={(item) => item?.label ?? ""}
                selectedItem={
                  connectionClientFilter === "All clients"
                    ? { id: "All clients", label: "All clients" }
                    : clients
                        .filter(
                          (client) => client.id === connectionClientFilter,
                        )
                        .map((client) => ({
                          id: client.id,
                          label: client.name,
                        }))[0]
                }
                onChange={({ selectedItem }) =>
                  setConnectionClientFilter(selectedItem?.id ?? "All clients")
                }
              />
              <div className="relay-table">{connectionTable(pagedRows)}</div>
              <Pagination
                className="relay-list-pagination"
                totalItems={rows.length}
                page={connectionPage}
                pageSize={connectionPageSize}
                pageSizes={[10, 20, 50]}
                onChange={({ page, pageSize }) => {
                  setConnectionPage(page);
                  setConnectionPageSize(pageSize);
                }}
              />
            </div>
          ) : (
            connectionTable(rows)
          )}
        </section>
      );
    }
    if (legacyActivePage === "clients")
      return (
        <>
          <div className="relay-detail-heading">
            <div className="relay-page-heading">
              <p className="cds--label-01">Relay library</p>
              <h1 className="cds--heading-06">Clients</h1>
              <p className="cds--body-02 relay-page-description">
                Keep customer organizations and their connection libraries
                distinct.
              </p>
            </div>
            <Button renderIcon={Add} onClick={() => go("client-form")}>
              Create client
            </Button>
          </div>
          {clients.length ? (
            <div className="relay-client-grid">
              {clients.map((client) => (
                <Tile key={client.id}>
                  <Stack gap={4}>
                    <div>
                      <ClickableTile
                        className="relay-client-tile"
                        href={`#client-${client.id}`}
                        onClick={(event) => {
                          event.preventDefault();
                          setSelectedClientId(client.id);
                          go("client-detail");
                        }}
                      >
                        <h2 className="cds--heading-03">{client.name}</h2>
                      </ClickableTile>
                    </div>
                    <p className="cds--body-01">
                      {
                        connections.filter(
                          (connection) => connection.clientId === client.id,
                        ).length
                      }{" "}
                      saved connections
                    </p>
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() => {
                        setFormClientId(client.id);
                        go("connection-form");
                      }}
                    >
                      Add connection
                    </Button>
                  </Stack>
                </Tile>
              ))}
            </div>
          ) : (
            <Tile className="relay-empty-state">
              <Stack gap={5}>
                <UserMultiple size={48} aria-hidden="true" />
                <h2 className="cds--heading-04">No clients yet</h2>
                <Button onClick={() => go("client-form")}>Create client</Button>
              </Stack>
            </Tile>
          )}
        </>
      );
    if (activePage === "import-export")
      return (
        <section className="relay-list-page" aria-labelledby="page-title">
          <div className="relay-page-heading">
            <p className="cds--label-01">Relay library</p>
            <h1 id="page-title" className="cds--heading-06">
              Import and export
            </h1>
            <p className="cds--body-02 relay-page-description">
              RDP files are reviewed before saving. Passwords, certificates, and
              publisher data are never imported or exported.
            </p>
          </div>
          {!clients.length ? (
            <InlineNotification
              hideCloseButton
              lowContrast
              kind="info"
              title="Create a client first"
              subtitle="Imported connections must belong to a client organization."
            />
          ) : (
            <>
              <Dropdown
                id="import-client"
                titleText="Import into client"
                label="Choose a client"
                items={clients}
                itemToString={(item) => item?.name ?? ""}
                selectedItem={clients.find(
                  (client) => client.id === (formClientId || clients[0]?.id),
                )}
                onChange={({ selectedItem }) =>
                  setFormClientId(selectedItem?.id ?? "")
                }
              />
              <FileUploaderButton
                labelText="Choose RDP file"
                accept={[".rdp"]}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void reviewRdpFile(file);
                }}
              />
              {importReview ? (
                <Tile>
                  <Stack gap={5}>
                    <div>
                      <h2 className="cds--heading-03">
                        Review {importReview.filename}
                      </h2>
                      <p className="cds--body-01">
                        {importReview.connection.host}:
                        {importReview.connection.port} ·{" "}
                        {importReview.connection.username || "No username"}
                      </p>
                    </div>
                    {importReview.duplicateConnectionId ? (
                      <InlineNotification
                        hideCloseButton
                        lowContrast
                        kind="warning"
                        title="Possible duplicate"
                        subtitle="Saving will replace the matching host, port, and username for this client."
                      />
                    ) : null}
                    {importReview.warnings.length ||
                    importReview.unsupportedKeys.length ? (
                      <InlineNotification
                        hideCloseButton
                        lowContrast
                        kind="warning"
                        title="Some RDP settings were not imported"
                        subtitle={formatRdpImportExclusions(importReview)}
                      />
                    ) : null}
                    <Button onClick={() => void commitRdpImport()}>
                      Save reviewed connection
                    </Button>
                  </Stack>
                </Tile>
              ) : null}
            </>
          )}
        </section>
      );
    if (activePage === "credentials")
      return (
        <section className="relay-list-page" aria-labelledby="page-title">
          <div className="relay-page-heading">
            <p className="cds--label-01">Relay security</p>
            <h1 id="page-title" className="cds--heading-06">
              Credentials
            </h1>
            <p className="cds--body-02 relay-page-description">
              Passwords are kept by your operating system, never in Relay’s
              library or RDP exports.
            </p>
          </div>
          <InlineNotification
            hideCloseButton
            lowContrast
            kind={vaultStatus?.available ? "success" : "warning"}
            title="Credential store"
            subtitle={
              vaultStatus?.message ??
              "Checking the operating system credential store…"
            }
          />
          {credentialMessage ? (
            <InlineNotification
              hideCloseButton
              lowContrast
              kind="info"
              title="Credential action"
              subtitle={credentialMessage}
            />
          ) : null}
          {clients.length ? (
            <Tile className="relay-credential-editor">
              <form
                className="relay-credential-form"
                onSubmit={(event) => void saveCredential(event)}
              >
                <h2 className="cds--heading-03">Save credential</h2>
                <Dropdown
                  id="credential-client"
                  titleText="Client"
                  label="Choose a client"
                  items={clients}
                  selectedItem={clients.find(
                    (client) =>
                      client.id === (credentialClientId || clients[0]?.id),
                  )}
                  itemToString={(item) => item?.name ?? ""}
                  onChange={({ selectedItem }) =>
                    setCredentialClientId(selectedItem?.id ?? "")
                  }
                />
                <TextInput
                  id="credential-label"
                  name="credentialLabel"
                  labelText="Credential label"
                  required
                />
                <TextInput
                  id="credential-username"
                  name="credentialUsername"
                  labelText="Username"
                />
                <TextInput
                  id="credential-domain"
                  name="credentialDomain"
                  labelText="Domain"
                />
                <TextInput
                  id="credential-password"
                  name="credentialPassword"
                  type="password"
                  labelText="Password"
                  required
                  autoComplete="new-password"
                />
                <Button type="submit" disabled={!vaultStatus?.available}>
                  Save credential
                </Button>
              </form>
            </Tile>
          ) : (
            <InlineNotification
              hideCloseButton
              lowContrast
              kind="info"
              title="Create a client first"
              subtitle="Credentials are always scoped to a client organization."
            />
          )}
          {credentials.length ? (
            <div className="relay-credential-grid">
              {credentials.map((credential) => (
                <Tile key={credential.id}>
                  <Stack gap={4}>
                    <div>
                      <h2 className="cds--heading-03">{credential.label}</h2>
                      <p className="cds--body-01">
                        {credential.domain ? `${credential.domain}\\` : ""}
                        {credential.username || "No username"}
                      </p>
                    </div>
                    <Button
                      kind="secondary"
                      renderIcon={Copy}
                      onClick={() => void copyCredential(credential.id)}
                    >
                      Copy password
                    </Button>
                  </Stack>
                </Tile>
              ))}
            </div>
          ) : null}
        </section>
      );
    if (activePage === "recent") {
      const recentPageCount = Math.max(
        1,
        Math.ceil(launchHistory.length / recentPageSize),
      );
      const currentRecentPage = Math.min(recentPage, recentPageCount);
      const recentEntries = launchHistory.slice(
        (currentRecentPage - 1) * recentPageSize,
        currentRecentPage * recentPageSize,
      );
      const formatLaunchTime = (occurredAt: number) =>
        new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(occurredAt * 1000));
      return (
        <section className="relay-list-page" aria-labelledby="page-title">
          <div className="relay-page-heading">
            <p className="cds--label-01">Relay library</p>
            <h1 id="page-title" className="cds--heading-06">
              Recent
            </h1>
            <p className="cds--body-02 relay-page-description">
              Local launch history contains connection names and outcome only;
              it never includes passwords.
            </p>
          </div>
          {launchHistory.length ? (
            <div className="relay-list-body">
              <div className="relay-table">
                <DataTable
                  rows={recentEntries.map((entry) => ({
                    id: String(entry.id),
                    connection:
                      connections.find(
                        (connection) => connection.id === entry.connectionId,
                      )?.name ?? "Deleted connection",
                    adapter: entry.adapter,
                    launchedAt: formatLaunchTime(entry.occurredAt),
                    outcome: entry.success ? "Started" : "Not started",
                  }))}
                  headers={[
                    { key: "connection", header: "Connection" },
                    { key: "adapter", header: "RDP client" },
                    { key: "launchedAt", header: "Launched" },
                    { key: "outcome", header: "Outcome" },
                  ]}
                >
                  {({
                    rows,
                    headers,
                    getHeaderProps,
                    getRowProps,
                    getTableProps,
                  }) => (
                    <Table {...getTableProps()} aria-label="Recent launches">
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader {...getHeaderProps({ header })}>
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow {...getRowProps({ row })}>
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>{cell.value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              </div>
              <Pagination
                className="relay-list-pagination"
                totalItems={launchHistory.length}
                page={currentRecentPage}
                pageSize={recentPageSize}
                pageSizes={[10, 20, 50]}
                onChange={({ page, pageSize }) => {
                  setRecentPage(page);
                  setRecentPageSize(pageSize);
                }}
              />
            </div>
          ) : (
            <Tile className="relay-empty-state">
              <Stack gap={4}>
                <RecentlyViewed size={48} aria-hidden="true" />
                <h2 className="cds--heading-04">No launch history yet</h2>
                <p className="cds--body-01">
                  Start a saved connection to see its local launch outcome here.
                </p>
              </Stack>
            </Tile>
          )}
        </section>
      );
    }
    if (activePage === "settings")
      return (
        <section className="relay-list-page" aria-labelledby="page-title">
          <div className="relay-page-heading">
            <p className="cds--label-01">Relay preferences</p>
            <h1 id="page-title" className="cds--heading-06">
              Settings
            </h1>
            <p className="cds--body-02 relay-page-description">
              Choose the interface appearance and review the RDP clients Relay
              can use on this computer.
            </p>
          </div>
          <Stack gap={6}>
            <Tile>
              <Stack gap={5}>
                <h2 className="cds--heading-03">Appearance</h2>
                <Dropdown
                  id="appearance"
                  titleText="Color theme"
                  label="Choose a color theme"
                  items={[
                    { id: "g10", label: "Light" },
                    { id: "g100", label: "Dark" },
                  ]}
                  itemToString={(item) => item?.label ?? ""}
                  selectedItem={
                    theme === "g10"
                      ? { id: "g10", label: "Light" }
                      : { id: "g100", label: "Dark" }
                  }
                  onChange={({ selectedItem }) =>
                    setTheme(selectedItem?.id === "g100" ? "g100" : "g10")
                  }
                />
              </Stack>
            </Tile>
            <Tile>
              <Stack gap={5}>
                <h2 className="cds--heading-03">RDP client availability</h2>
                {adapterSupport.length ? (
                  adapterSupport.map((adapter) => (
                    <InlineNotification
                      key={adapter.id}
                      hideCloseButton
                      lowContrast
                      kind={adapter.available ? "success" : "info"}
                      className={
                        adapter.available
                          ? undefined
                          : "relay-ghost-notification"
                      }
                      title={adapter.label}
                      subtitle={`${adapter.available ? "Available." : "Not available."} ${adapter.notes}`}
                    />
                  ))
                ) : (
                  <InlineNotification
                    hideCloseButton
                    lowContrast
                    kind="info"
                    title="Desktop check required"
                    subtitle="Client availability is checked when Relay runs as a desktop application."
                  />
                )}
              </Stack>
            </Tile>
            <Tile>
              <Stack gap={5}>
                <div>
                  <h2 className="cds--heading-03">Application updates</h2>
                  <p className="cds--body-01">
                    Relay {appVersion}. Download and install signed updates from
                    Relay's release channel.
                  </p>
                </div>
                <Button
                  kind="tertiary"
                  onClick={() => void checkForUpdates()}
                  disabled={updateCheck.status === "checking"}
                >
                  Check for updates
                </Button>
                {updateCheck.status === "checking" ? (
                  <InlineLoading description="Checking for updates" />
                ) : null}
                {updateCheck.status === "available" ? (
                  <>
                    <InlineNotification
                      hideCloseButton
                      lowContrast
                      kind="success"
                      title={`Version ${updateCheck.latestVersion} is available`}
                      subtitle="Download and install it now."
                    />
                    <Button kind="primary" onClick={() => void installUpdate()}>
                      Update now
                    </Button>
                  </>
                ) : null}
                {updateCheck.status === "downloading" ? (
                  <>
                    <InlineLoading description="Downloading and installing update" />
                    <p className="cds--body-compact-01">
                      {updateProgress?.total
                        ? `${formatDownloadSize(updateProgress.downloaded)} of ${formatDownloadSize(updateProgress.total)} downloaded`
                        : `${formatDownloadSize(updateProgress?.downloaded ?? 0)} downloaded`}
                    </p>
                  </>
                ) : null}
                {updateCheck.status === "installed" ? (
                  <InlineNotification
                    hideCloseButton
                    lowContrast
                    kind="success"
                    title={`Version ${updateCheck.latestVersion} is installed`}
                    subtitle="Quit and reopen Relay to use the new version."
                  />
                ) : null}
                {updateCheck.status === "upToDate" ? (
                  <InlineNotification
                    hideCloseButton
                    lowContrast
                    kind="success"
                    title="Relay is up to date"
                    subtitle={`Version ${appVersion} is the latest published release.`}
                  />
                ) : null}
                {updateCheck.status === "error" ? (
                  <InlineNotification
                    hideCloseButton
                    lowContrast
                    kind="error"
                    title="Could not check for updates"
                    subtitle={
                      updateCheck.errorMessage ??
                      "Relay could not reach its signed release feed. Check your internet connection and try again."
                    }
                  />
                ) : null}
              </Stack>
            </Tile>
            <Tile>
              <Stack gap={5}>
                <div>
                  <h2 className="cds--heading-03">Backup and restore</h2>
                  <p className="cds--body-01">
                    Backups contain your library settings and launch history.
                    They never contain passwords from your operating system
                    credential store.
                  </p>
                </div>
                <ButtonSet className="relay-backup-actions">
                  <Button onClick={() => void createBackup()}>
                    Download backup
                  </Button>
                  <FileUploaderButton
                    buttonKind="tertiary"
                    className="relay-restore-backup"
                    labelText="Restore backup"
                    accept={[".json", ".relay-backup.json"]}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (
                        file &&
                        window.confirm(
                          "Restore replaces the current Relay library. Relay will download a safety backup first. Continue?",
                        )
                      )
                        void restoreBackup(file);
                    }}
                  />
                </ButtonSet>
                {backupMessage ? (
                  <InlineNotification
                    hideCloseButton
                    lowContrast
                    kind={
                      backupMessage.startsWith("Restore was") ||
                      backupMessage.startsWith("Relay could")
                        ? "error"
                        : "success"
                    }
                    title="Backup status"
                    subtitle={backupMessage}
                  />
                ) : null}
              </Stack>
            </Tile>
          </Stack>
        </section>
      );
    return (
      <>
        <div className="relay-page-heading">
          <p className="cds--label-01">Relay library</p>
          <h1 className="cds--heading-06">{page.title}</h1>
          <p className="cds--body-02 relay-page-description">
            {page.description}
          </p>
        </div>
        <InlineNotification
          hideCloseButton
          lowContrast
          kind="info"
          title="Available in a later stage"
          subtitle="This workflow is outside the current stable-release scope."
        />
      </>
    );
  };
  return (
    <FeatureFlags enableV12DynamicFloatingStyles>
      <Theme theme={theme}>
        <Header aria-label="Relay" className="relay-header">
          <HeaderName
            href="#connections"
            onClick={() => go("connections")}
            prefix=""
          >
            Relay RDP Manager
          </HeaderName>
          <Tag className="relay-stage-tag" type="blue">
            Stage 6 — Stable 1.0
          </Tag>
        </Header>
        <SideNav aria-label="Primary navigation" expanded isPersistent>
          <SideNavItems>
            {navigation.map((item) => (
              <SideNavLink
                href={`#${item.id}`}
                isActive={activePage === item.id}
                key={item.id}
                onClick={() => go(item.id)}
                renderIcon={item.icon}
              >
                {item.label}
              </SideNavLink>
            ))}
          </SideNavItems>
        </SideNav>
        <Content id="main-content" className="relay-content">
          <Grid fullWidth>
            <Column sm={4} md={8} lg={16} xlg={16}>
              <Stack className="relay-page-frame" gap={7}>
                {renderPage()}
              </Stack>
            </Column>
          </Grid>
        </Content>
      </Theme>
    </FeatureFlags>
  );
}
export default App;
