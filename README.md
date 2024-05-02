# @pup/api-client

@pup/api-client is a runtime agnostic TypeScript REST client for interacting
with the Pup REST API. It leverages types from `@pup/api-definitions` to ensure
type-safe and reliable communication with your Pup instance, and is actually
used internally in pup to send commands (such as `pup status`) from the
command-line to the main process.

**Usage**

1. **Install:**

Full intallation instructions (including Node.js, Bun etc) available on
<https://jsr.io/@pup/api-client>, example for Deno:

```bash
deno add @pup/api-client @pup/api-definitions
```

2. **Instantiate and Use:**

   ```typescript
   import { type ApiResponse, PupRestClient } from "@pup/api-client";
   import type { ApiApplicationState } from "@pup/api-definitions";

   // You can find the api url and token using `pup state` and `pup token` on the cli
   const client = new PupRestClient("http://host:port", "your-token");
   const response: ApiResponse<ApiApplicationState> = await client.getState();
   console.log(response);

   // If a new token is issued
   ```

**Key Features**

- **Type-safe:** Built on the types from `@pup/api-definitions` for a robust
  development experience.
- **Methods for API Endpoints:** Provides methods corresponding to Pup REST API
  endpoints (e.g., `getState`, `startProcess`, `getLogs`).
- **Error Handling:** Includes error handling mechanisms for graceful failure
  management.
- **Authentication and Token Refresh:** Employs JSON Web Tokens (JWT) for secure
  authentication with the Pup REST API. Supports periodic token refreshes
  through the method `.refreshApiToken()`.

**Development and Contributions**

The `@pup/api-client` is actively maintained by the Pup development team. For
feature requests or bug reports, please open issues on the GitHub repository
here: https://github.com/hexagon/pup-api-client/issues>. Contributions are
welcome!

This library follows semantic versioning. For a detailed history of changes,
please refer to the [./CHANGELOG.md](CHANGELOG.md).

**License**

This package is released under the MIT License. See [LICENSE](LICENSE) for
details.
