/**
 * A Rest API client for Pup
 *
 * @file pup.ts
 * @license MIT
 */

import { type ApiResponse, RestClient } from "./rest.ts";

import type {
  ApiApplicationState,
  ApiLogItem,
  ApiProcessData,
  ApiTelemetryData,
} from "@pup/api-definitions";

export class PupRestClient extends RestClient {
  constructor(baseUrl: string, jwtSecret: string) {
    super(baseUrl, jwtSecret);
  }

  async getProcesses(): Promise<ApiResponse<ApiProcessData[]>> {
    return await this.get("/processes");
  }

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

  async sendTelemetry(
    telemetryData: ApiTelemetryData,
  ): Promise<ApiResponse<void>> {
    return await this.post("/telemetry", telemetryData);
  }

  async terminate(): Promise<ApiResponse<void>> {
    return await this.post("/terminate");
  }

  async sendLog(
    severity: string,
    plugin: string,
    message: string,
  ): Promise<ApiResponse<void>> {
    return await this.post("/log", { severity, plugin, message });
  }

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
}
