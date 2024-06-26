/**
 * A base Rest API client with support for JWT Bearer Auth and retry with exponential backoff
 *
 * @file mod.ts
 * @license MIT
 */

export interface ApiResponse<T> {
  error?: string;
  data?: T;
  response?: Response;
}

export class RestAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public responseData?: any,
  ) {
    super(message);
  }
}

export class RestAPIConnectionError extends Error {
  constructor(
    message: string,
  ) {
    super(message);
  }
}

export class RestClient {
  public baseUrl: string; // Declare the types
  public token: string;
  private requestTimeoutMs: number;
  private retries: number;

  constructor(
    baseUrl: string,
    token: string,
    requestTimeoutMs: number,
    retries: number,
  ) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.requestTimeoutMs = requestTimeoutMs;
    this.retries = retries;
  }

  /**
   * Updates the internal API token used for authentication.
   *
   * @param token - The new API token provided by Pup.
   * @returns A promise that resolves when the token has been updated.
   */
  refreshApiToken(token: string): void {
    this.token = token;
  }

  /**
   * Sends a GET request to the specified API endpoint.
   *
   * @param path - The path of the resource to fetch (relative to the base URL).
   * @param options - Additional options for the fetch request.
   * @returns A promise resolving to an ApiResponse object. If the request is successful
   *          and returns data, the ApiResponse will include the parsed data. If no data
   *          is returned, the data property in ApiResponse will be undefined. Otherwise,
   *          the error property will be populated.
   * @throws RestAPIError - If the API request fails.
   */
  get<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.fetch(path, { method: "GET", ...options });
  }

  /**
   * Sends a POST request to the specified API endpoint.
   *
   * @param path - The path of the resource to create (relative to the base URL).
   * @param data - The data to send in the request payload (will be serialized as JSON)
   * @param options - Additional options for the fetch request.
   * @returns A promise resolving to an ApiResponse object. If the request is successful
   *          and returns data, the ApiResponse will include the parsed data. Otherwise,
   *          the error property will be populated.
   * @throws RestAPIError - If the API request fails.
   */
  post(
    path: string,
    data: any = undefined,
    options: RequestInit = {},
  ): Promise<ApiResponse<void>> {
    return this.fetch<void>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Sends a PUT request to the specified API endpoint.
   *
   * @param path - The path of the resource to update (relative to the base URL).
   * @param data - The data to send in the request payload (will be serialized as JSON)
   * @param options - Additional options for the fetch request.
   * @returns A promise resolving to an ApiResponse object. If the request is successful
   *          and returns data, the ApiResponse will include the parsed data. Otherwise,
   *          the error property will be populated.
   * @throws RestAPIError - If the API request fails.
   */
  put(
    path: string,
    data: any,
    options: RequestInit = {},
  ): Promise<ApiResponse<void>> {
    return this.fetch<void>(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Sends a DELETE request to the specified API endpoint.
   *
   * @param path - The path of the resource to delete (relative to the base URL).
   * @param options - Additional options for the fetch request.
   * @returns A promise resolving to an ApiResponse object. If the request is successful
   *          and returns data, the ApiResponse will include the parsed data. If no data
   *          is returned, the data property in ApiResponse will be undefined. Otherwise,
   *          the error property will be populated.
   * @throws RestAPIError - If the API request fails.
   */
  delete<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.fetch(path, { method: "DELETE", ...options });
  }

  /**
   *  Performs a generic fetch operation against the configured API endpoint.
   *  Includes JWT bearer authentication, retry logic, and error handling.
   *
   * @param path - The path of the resource to fetch (relative to the base URL).
   * @param options - Additional options for the fetch request.
   * @param maxRetries - Maximum number of retries (defaults to 3).
   * @param initialRetryDelay - Initial delay in milliseconds before the first retry (defaults to 200ms)
   * @returns A promise resolving to an ApiResponse object. If the request is successful,
   *          the ApiResponse will include the parsed data. Otherwise, the error property will be populated.
   * @throws RestAPIError - If the API request fails.
   * @throws Error - If retries are exhausted or due to internal issues.
   */
  async fetch<T>(
    path: string,
    options: RequestInit,
    initialRetryDelay = 200,
  ): Promise<ApiResponse<T>> {
    let retries = 0;
    let timeoutTimer;
    while (retries <= this.retries) {
      try {
        // Expand existing headers with the bearer token
        const headers = {
          "Authorization": "Bearer " + this.token,
          ...options.headers,
        };

        // Prepare an abort controller and timeout handler
        const controller = new AbortController();
        timeoutTimer = setTimeout(
          () => controller.abort(),
          this.requestTimeoutMs,
        );

        // Make the request
        const response = await fetch(this.baseUrl + path, {
          ...options,
          headers,
          signal: controller.signal,
        });

        // Reset the timer
        clearTimeout(timeoutTimer);

        if (!response.ok) {
          let errorData;

          // Catch any response body sent with the error */
          try {
            errorData = await response.json();
          } catch (_e) { /* Ok! */ }

          // Throw!
          throw new RestAPIError(
            `Request failed: ${response.statusText}`,
            response.status,
            errorData,
          );
        }

        // Return an object
        try {
          return await response.json();
        } catch (_e) {
          return {};
        }
      } catch (error) {
        // Throw errors after retries are exhausted
        if (retries >= this.retries) {
          if (error.name === "RestApiError") {
            throw error;
          } else if (error.name === "AbortError") {
            throw new RestAPIConnectionError(
              "Could not connect to server, connection refused.",
            );
          } else {
            if (error.responseData?.error) {
              throw new RestAPIConnectionError(
                `Could not connect to server, retries exhausted. Response data: '${error.responseData.error}'`,
              );
            } else if (error.status) {
              throw new RestAPIConnectionError(
                `Could not connect to server, retries exhausted. Response status: '${error.status}'`,
              );
            }
          }
        }

        // Exponential backoff
        const delay = initialRetryDelay * Math.pow(2, retries);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
      } finally {
        // Always make sure the timeout timer is reset
        if (timeoutTimer) clearTimeout(timeoutTimer);
      }
    }
    // This should ideally not happen, but in case it does...
    throw new Error("Internal Error - failed to complete any retry");
  }
}
