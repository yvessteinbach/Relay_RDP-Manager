import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import App from "./App";
describe("Relay Stage 6 interaction model", () => {
  it("guides a first-run user to create a client", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "All connections" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create client" }),
    ).toBeInTheDocument();
  });
  it("simulates create, save, review, and connect", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Create client" }));
    await user.type(screen.getByLabelText("Client name"), "Example client");
    await user.click(screen.getByRole("button", { name: "Save client" }));
    await user.click(screen.getByRole("link", { name: "Example client" }));
    await user.click(
      screen.getAllByRole("button", { name: "Add connection" })[0],
    );
    await user.type(screen.getByLabelText("Connection name"), "Example server");
    await user.type(
      screen.getByLabelText("Host or IP address"),
      "server.example.test",
    );
    await user.click(screen.getByRole("button", { name: "Save connection" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Example server" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Connect" }));
    await waitFor(() =>
      expect(
        screen.getByText(/No supported RDP client is available/),
      ).toBeInTheDocument(),
    );
  });
  it("saves a client without requiring its first connection", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Create client" }));
    await user.type(screen.getByLabelText("Client name"), "Northwind");
    await user.click(screen.getByRole("button", { name: "Save client" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Clients" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Northwind")).toBeInTheDocument();
  });
  it("offers an optional password while adding a connection", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Create client" }));
    await user.type(screen.getByLabelText("Client name"), "Northwind");
    await user.click(screen.getByRole("button", { name: "Save client" }));
    await user.click(screen.getByRole("link", { name: "Northwind" }));
    await user.click(
      screen.getAllByRole("button", { name: "Add connection" })[0],
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByText(/operating system credential store/),
    ).toBeInTheDocument();
  });
  it("lets a newly created connection be marked as a favorite", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Create client" }));
    await user.type(screen.getByLabelText("Client name"), "Example client");
    await user.click(screen.getByRole("button", { name: "Save client" }));
    await user.click(screen.getByRole("link", { name: "Example client" }));
    await user.click(
      screen.getAllByRole("button", { name: "Add connection" })[0],
    );
    await user.type(screen.getByLabelText("Connection name"), "Example server");
    await user.type(
      screen.getByLabelText("Host or IP address"),
      "server.example.test",
    );
    await user.click(screen.getByRole("button", { name: "Save connection" }));
    await user.click(
      screen.getByRole("button", { name: "Additional actions" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Add to favorites" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Additional actions" }),
    );
    expect(
      await screen.findByRole("menuitem", { name: "Remove from favorites" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Favorites" }));
    expect(screen.getByText("Example server")).toBeInTheDocument();
  });
  it("opens a connection from its row and saves edits to its connection details", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Create client" }));
    await user.type(screen.getByLabelText("Client name"), "Northwind");
    await user.click(screen.getByRole("button", { name: "Save client" }));
    await user.click(screen.getByRole("link", { name: "Northwind" }));
    await user.click(
      screen.getAllByRole("button", { name: "Add connection" })[0],
    );
    await user.type(screen.getByLabelText("Connection name"), "RD01");
    await user.type(screen.getByLabelText("Host or IP address"), "10.0.0.1");
    await user.click(screen.getByRole("button", { name: "Save connection" }));
    await user.click(screen.getByRole("link", { name: "All connections" }));
    await user.click(screen.getByText("RD01"));
    expect(screen.getByRole("heading", { name: "RD01" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "All connections" }));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const host = screen.getByLabelText("Host or IP address");
    await user.clear(host);
    await user.type(host, "10.0.0.2");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getAllByText("10.0.0.2")).not.toHaveLength(0);
    await user.click(screen.getByRole("tab", { name: "Security" }));
    expect(screen.getByText("Not saved")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Set password" }));
    expect(
      screen.getByRole("heading", { name: "Edit connection" }),
    ).toBeInTheDocument();
  });
  it("changes page through the primary navigation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: "Clients" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Clients" }),
    ).toBeInTheDocument();
  });
  it("opens a client and lists its saved connections", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Create client" }));
    await user.type(screen.getByLabelText("Client name"), "Example client");
    expect(screen.queryByLabelText("Short name")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Save client" }));
    await user.click(screen.getByRole("link", { name: "Example client" }));
    await user.click(
      screen.getAllByRole("button", { name: "Add connection" })[0],
    );
    await user.type(screen.getByLabelText("Connection name"), "Example server");
    await user.type(
      screen.getByLabelText("Host or IP address"),
      "server.example.test",
    );
    await user.click(screen.getByRole("button", { name: "Save connection" }));
    await user.click(screen.getByRole("link", { name: "Clients" }));
    await user.click(screen.getByRole("link", { name: "Example client" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Example client" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Example server")).toBeInTheDocument();
    expect(screen.getByText("server.example.test")).toBeInTheDocument();
  });
  it("keeps the primary navigation permanently visible", () => {
    render(<App />);
    expect(
      screen.getByRole("link", { name: "All connections" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /navigation/i })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Relay RDP Manager" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Stage 6 — Stable 1.0")).toBeInTheDocument();
  });
  it("has no automatically detectable accessibility violations", async () => {
    render(<App />);
    const results = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
