import type { Client, Connection } from "../app/types";

export function ContextStrip({
  connection,
  client,
}: {
  connection?: Connection;
  client?: Client;
}) {
  if (!connection && !client) return null;
  return (
    <div className="relay-context-strip">
      <span>Client</span>
      <strong>{client?.name ?? "Choose a client"}</strong>
      {connection ? (
        <>
          <span>Connection</span>
          <strong>{connection.name}</strong>
        </>
      ) : null}
    </div>
  );
}
