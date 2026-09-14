import {
  Add,
  ArrowRight,
  ConnectionSignal,
  UserMultiple,
} from "@carbon/icons-react";
import {
  Button,
  ButtonSet,
  ClickableTile,
  Pagination,
  Search,
  Stack,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import { useState } from "react";
import type { ScreenProps } from "../app/page-types";
import { ContextStrip } from "../components/ContextStrip";
import { ConnectionTable } from "../components/ConnectionTable";

export function ClientFormPage({ createClient, go }: ScreenProps) {
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
      <form key="client-form" className="relay-form" onSubmit={createClient}>
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
          <Button kind="secondary" type="button" onClick={() => go("clients")}>
            Cancel
          </Button>
          <Button type="submit">Save client</Button>
        </ButtonSet>
      </form>
    </>
  );
}

export function ClientsPage({
  clients,
  go,
  query,
  setQuery,
  setSelectedClientId,
}: ScreenProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const needle = query.trim().toLowerCase();
  const matchingClients = clients.filter(
    (client) =>
      !needle ||
      [client.name, client.notes].some((value) =>
        value.toLowerCase().includes(needle),
      ),
  );
  const pageCount = Math.max(1, Math.ceil(matchingClients.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedClients = matchingClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  return (
    <section className="relay-list-page" aria-labelledby="page-title">
      <div className="relay-detail-heading">
        <div className="relay-page-heading">
          <p className="cds--label-01">Relay library</p>
          <h1 id="page-title" className="cds--heading-06">
            Clients
          </h1>
          <p className="cds--body-02 relay-page-description">
            Keep customer organizations and their connection libraries distinct.
          </p>
        </div>
        <Button renderIcon={Add} onClick={() => go("client-form")}>
          Create client
        </Button>
      </div>
      {clients.length ? (
        <div className="relay-list-body">
          <Search
            id="client-search"
            labelText="Search clients"
            placeholder="Search clients"
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setPage(1);
            }}
          />
          {pagedClients.length ? (
            <div className="relay-client-grid">
              {pagedClients.map((client) => (
                <ClickableTile
                  key={client.id}
                  className="relay-client-card"
                  href={`#client-${client.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    setSelectedClientId(client.id);
                    go("client-detail");
                  }}
                >
                  <div className="relay-client-card__content">
                    <h2 className="cds--heading-04">{client.name}</h2>
                    {client.notes ? (
                      <p className="cds--body-02">{client.notes}</p>
                    ) : null}
                  </div>
                  <ArrowRight
                    className="relay-client-card__arrow"
                    aria-hidden="true"
                  />
                </ClickableTile>
              ))}
            </div>
          ) : (
            <Tile className="relay-client-no-results">
              No clients match your search.
            </Tile>
          )}
          <Pagination
            className="relay-list-pagination"
            totalItems={matchingClients.length}
            page={currentPage}
            pageSize={pageSize}
            pageSizes={[6, 12, 24]}
            onChange={({ page: nextPage, pageSize: nextPageSize }) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
          />
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
    </section>
  );
}

export function ClientDetailPage(props: ScreenProps) {
  const client = props.clients.find(
    (item) => item.id === props.selectedClientId,
  );
  if (!client) return null;
  const clientConnections = props.connections.filter(
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
          <Button kind="secondary" onClick={() => props.go("clients")}>
            Back to clients
          </Button>
          <Button
            renderIcon={Add}
            onClick={() => {
              props.setFormClientId(client.id);
              props.go("connection-form");
            }}
          >
            Add connection
          </Button>
        </div>
      </div>
      <div className="relay-table">
        {clientConnections.length ? (
          <ConnectionTable {...props} items={clientConnections} />
        ) : (
          <Tile className="relay-empty-state">
            <Stack gap={5}>
              <ConnectionSignal size={48} aria-hidden="true" />
              <h2 className="cds--heading-04">No saved connections</h2>
              <Button
                renderIcon={Add}
                onClick={() => {
                  props.setFormClientId(client.id);
                  props.go("connection-form");
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
