import { Edit, Favorite, FavoriteFilled } from "@carbon/icons-react";
import {
  Button,
  ButtonSet,
  Checkbox,
  ComboButton,
  Dropdown,
  InlineLoading,
  InlineNotification,
  MenuItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  TextInput,
  Tile,
} from "@carbon/react";
import type { ScreenProps } from "../app/page-types";
import { ContextStrip } from "../components/ContextStrip";

const displays = ["Windowed", "Full screen", "Use RDP client default"];

export function ConnectionFormPage({
  clients,
  formClientId,
  createConnection,
  setDisplay,
  go,
  launchMessage,
}: ScreenProps) {
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
          items={displays}
          initialSelectedItem="Use RDP client default"
          onChange={({ selectedItem }) => setDisplay(String(selectedItem))}
        />
        <Checkbox id="favorite" name="favorite" labelText="Add to favorites" />
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
}

export function ConnectionEditPage({
  selectedConnection,
  selectedClient,
  editConnection,
  display,
  setDisplay,
  go,
  editMessage,
}: ScreenProps) {
  if (!selectedConnection) return null;
  return (
    <>
      <ContextStrip connection={selectedConnection} client={selectedClient} />
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
          items={displays}
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
}

export function ConnectionDetailPage({
  selectedConnection,
  selectedClient,
  selectedCredential,
  adapterSupport,
  vaultStatus,
  launching,
  launchMessage,
  toggleSelectedConnectionFavorite,
  startConnection,
  exportSelectedConnection,
  setDisplay,
  setEditMessage,
  go,
}: ScreenProps) {
  if (!selectedConnection) return null;
  const edit = () => {
    setDisplay(selectedConnection.display || "Use RDP client default");
    setEditMessage("");
    go("connection-edit");
  };
  return (
    <>
      <ContextStrip connection={selectedConnection} client={selectedClient} />
      <div className="relay-detail-heading">
        <div>
          <p className="cds--label-01">Connection</p>
          <h1 className="cds--heading-06" aria-label={selectedConnection.name}>
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
          <ComboButton
            label={launching ? "Preparing connection" : "Connect"}
            onClick={() => void startConnection()}
            disabled={launching}
            menuAlignment="bottom-end"
          >
            <MenuItem
              label={
                selectedConnection.favorite
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
              renderIcon={
                selectedConnection.favorite ? FavoriteFilled : Favorite
              }
              onClick={toggleSelectedConnectionFavorite}
            />
            <MenuItem label="Edit" renderIcon={Edit} onClick={edit} />
            <MenuItem
              label="Export RDP"
              onClick={() => void exportSelectedConnection()}
            />
          </ComboButton>
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
                      {selectedConnection.display || "Use RDP client default"}
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
                      <Button kind="secondary" renderIcon={Edit} onClick={edit}>
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
}
