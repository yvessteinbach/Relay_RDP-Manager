import { Add, ConnectionSignal, Edit } from "@carbon/icons-react";
import {
  Button,
  DataTable,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@carbon/react";
import type { Connection } from "../app/types";
import type { ScreenProps } from "../app/page-types";

type Props = ScreenProps & { items: Connection[] };

export function ConnectionTable({
  items,
  clients,
  launching,
  go,
  setSelectedConnection,
  setDisplay,
  setEditMessage,
  startConnection,
}: Props) {
  if (!items.length)
    return (
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
  return (
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
  );
}
