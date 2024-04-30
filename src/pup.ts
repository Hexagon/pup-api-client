/**
 * A Rest API client for Pup
 *
 * @file pup.ts
 * @license MIT
 */

import { EventEmitter, type EventHandler } from "@pup/common/eventemitter";

import { type ApiResponse, RestClient } from "./rest.ts";

import WebSocket from "ws";

import type {
  ApiApplicationState,
  ApiIpcData,
  ApiLogItem,
  ApiProcessData,
  ApiTelemetryData,
} from "@pup/api-definitions";

export class PupRestClient extends RestClient {
  private websocket?: WebSocket;
  private events: EventEmitter = new EventEmitter();
  private aborted: boolean = false;

  /**
   * Constructs a new PupRestClient instance.
   *
   * @param baseUrl - The base URL of the Pup API.
   * @param token -  The JWT token used for authentication.
   * @param eventStream - Optional flag to enable real-time updates via WebSocket (defaults to false).
   */
  constructor(
    baseUrl: string,
    token: string,
    eventStream: boolean = false,
  ) {
    super(baseUrl, token);
    if (eventStream) {
      this.setupEventStream();
    }
  }

  /**
   * Updates the internal API token used for authentication.
   * Typically called by Pup plugins when Pup issue a new token for the Plugin.
   *
   * @param token - The new API token provided by Pup.
   * @returns A promise that resolves when the token has been updated.
   */
  refreshApiToken(token: string): void {
    this.token = token;
  }

  /**
   * Retrieves a list of processes from the Pup API.
   */
  async getProcesses(): Promise<ApiResponse<ApiProcessData[]>> {
    return await this.get("/processes");
  }

  /**
   * Fetches the current application state of the Pup system, including memory usage, cpu usage, version numbers etc.
   */
  async getState(): Promise<ApiResponse<ApiApplicationState>> {
    return await this.get("/state");
  }

  async startProcess(processId: string): Promise<ApiResponse<void>> {
    return await this.post(`/processes/${processId}/start`);
  }

  async stopProcess(processId: string): Promise<ApiResponse<void>> {
    return await this.post(`/processes/${processId}/stop`);
  }

  async restartProcess(processId: string): Promise<ApiResponse<void>> {
    return await this.post(`/processes/${processId}/restart`);
  }

  async blockProcess(processId: string): Promise<ApiResponse<void>> {
    return await this.post(`/processes/${processId}/block`);
  }

  async unblockProcess(processId: string): Promise<ApiResponse<void>> {
    return await this.post(`/processes/${processId}/unblock`);
  }

  /**
   * Transmits telemetry for a client process to Pup.
   * - Should only be used by the Telemetry-component.
   *
   * @param telemetryData - The ApiTelemetryData object to send.
   * @returns  A Promise that resolves to an ApiResponse (no data expected).
   */
  async sendTelemetry(
    telemetryData: ApiTelemetryData,
  ): Promise<ApiResponse<void>> {
    return await this.post("/telemetry", telemetryData);
  }

  /**
   * Transmits an ipc message to client processes of Pup.
   *
   * @param ipcData - The ApiIpcData object to send.
   * @returns  A Promise that resolves to an ApiResponse (no data expected).
   */
  async sendIpc(
    ipcData: ApiIpcData,
  ): Promise<ApiResponse<void>> {
    return await this.post("/ipc", ipcData);
  }

  /**
   * Terminates Pup completely
   */
  async terminate(): Promise<ApiResponse<void>> {
    return await this.post("/terminate");
  }

  /**
   * Sends a structured log message to the Pup API.
   *
   * @param severity - The severity level of the log message (e.g., "debug", "info", "warn", "error").
   * @param plugin - The name of the plugin or subsystem that generated the log message.
   * @param message -  The text content of the log message.
   * @returns A Promise that resolves to an ApiResponse (likely indicating success or failure).
   */
  async sendLog(
    severity: string,
    plugin: string,
    message: string,
  ): Promise<ApiResponse<void>> {
    return await this.post("/log", { severity, plugin, message });
  }

  /**
   * Retrieves logs from Pup with optional filtering.
   *
   * @param processId - Optional ID of the process to filter logs by.
   * @param startTimeStamp - Optional timestamp for filtering logs by start time.
   * @param endTimeStamp - Optional timestamp for filtering logs by end time.
   * @param severity -  Optional severity level to filter logs by.
   * @param nRows - Optional maximum number of log entries to return.
   * @returns A Promise that resolves to an ApiResponse containing an array of ApiLogItem objects.
   */
  async getLogs(
    processId?: string,
    startTimeStamp?: number,
    endTimeStamp?: number,
    severity?: string,
    nRows?: number,
  ): Promise<ApiResponse<ApiLogItem[]>> {
    // Replace any[] with the type of a single log entry
    const queryParams = new URLSearchParams();

    if (processId) queryParams.append("processId", processId);
    if (startTimeStamp) {
      queryParams.append("startTimeStamp", startTimeStamp.toString());
    }
    if (endTimeStamp) {
      queryParams.append("endTimeStamp", endTimeStamp.toString());
    }
    if (severity) queryParams.append("severity", severity);
    if (nRows) queryParams.append("nRows", nRows.toString());

    return await this.get(`/logs?${queryParams.toString()}`); // Send query parameters
  }

  private setupEventStream() {
    const wsUrl = `${this.baseUrl.replace("http", "ws")}/wss`;
    const connect = () => {
      if (!this.aborted) {
        this.websocket = new WebSocket(wsUrl, {
          headers: {
            "Authorization": `Bearer ${this.token}`,
          },
        });
        this.websocket.on("message", (event: unknown) => {
          try {
            const data = JSON.parse(
              new TextDecoder().decode(event as Uint8Array),
            );
            this.events.emit(data.t, data.d);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        });
        this.websocket.on("close", () => {
          if (!this.aborted) {
            setInterval(() => {
              connect(); // Attempt to reconnect
            }, 2500);
          }
        });
      }
    };
    connect(); // Initial connection
  }

  on(event: string, fn: EventHandler<unknown>) {
    this.events.on(event, fn);
  }

  off(event: string, fn: EventHandler<unknown>) {
    this.events.off(event, fn);
  }

  close() {
    this.aborted = true;
    this.events.close();
    this.websocket?.close();
  }
}
