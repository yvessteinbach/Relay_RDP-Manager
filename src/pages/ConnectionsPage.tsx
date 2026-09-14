import { Add } from "@carbon/icons-react";
import { Button, Dropdown, Pagination, Search } from "@carbon/react";
import type { ScreenProps } from "../app/page-types";
import { pageCopy } from "../app/navigation";
import { ConnectionTable } from "../components/ConnectionTable";

export function ConnectionsPage(
  props: ScreenProps & { mode: "connections" | "favorites" },
) {
  const {
    mode,
    connections,
    clients,
    query,
    connectionClientFilter,
    connectionPage,
    connectionPageSize,
  } = props;
  const page = pageCopy[mode];
  const needle = query.trim().toLowerCase();
  const matches = connections.filter(
    (connection) =>
      !needle ||
      [
        connection.name,
        connection.host,
        connection.username,
        clients.find((client) => client.id === connection.clientId)?.name ?? "",
      ].some((value) => value.toLowerCase().includes(needle)),
  );
  const rows =
    mode === "favorites"
      ? matches.filter((connection) => connection.favorite)
      : matches.filter(
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
            props.go(clients.length ? "connection-form" : "client-form")
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
            onChange={(event) => props.setQuery(event.currentTarget.value)}
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
                    .filter((client) => client.id === connectionClientFilter)
                    .map((client) => ({ id: client.id, label: client.name }))[0]
            }
            onChange={({ selectedItem }) =>
              props.setConnectionClientFilter(selectedItem?.id ?? "All clients")
            }
          />
          <div className="relay-table">
            <ConnectionTable {...props} items={pagedRows} />
          </div>
          <Pagination
            className="relay-list-pagination"
            totalItems={rows.length}
            page={connectionPage}
            pageSize={connectionPageSize}
            pageSizes={[10, 20, 50]}
            onChange={({ page, pageSize }) => {
              props.setConnectionPage(page);
              props.setConnectionPageSize(pageSize);
            }}
          />
        </div>
      ) : (
        <ConnectionTable {...props} items={rows} />
      )}
    </section>
  );
}
