# Dependency and license reporting

Relay keeps its dependency lockfiles under version control: `package-lock.json` for the frontend and `src-tauri/Cargo.lock` for the native application. Before every release, generate and attach these reports from the release checkout:

```sh
npm exec @cyclonedx/cdxgen -- --output sbom.cdx.json
(cd src-tauri && cargo install cargo-cyclonedx --locked && cargo cyclonedx --format json)
npm exec license-checker-rseidelsohn -- --production --json --out frontend-licenses.json
(cd src-tauri && cargo install cargo-about --locked && cargo about generate about.hbs > native-licenses.html)
```

Review the reports for policy compatibility and unexpected transitive changes. The application currently uses Apache-2.0 licensed Carbon packages and permissively licensed Rust/Tauri dependencies; generated reports, rather than this summary, are the release record.
