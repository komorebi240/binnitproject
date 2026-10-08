import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api-response";
import type {
  AuditEntry,
  Column,
  CrmColumnType,
  DatasetDetail,
  Dataset,
  ImportOptions,
  ImportPreview,
  ImportResult,
  Row,
  RowPage,
  SaveDatasetInput,
} from "../types";

export async function listDatasets(): Promise<Dataset[]> {
  const { data } = await apiClient.get<ApiResponse<Dataset[]>>("/crm/datasets");
  return data.data as Dataset[];
}

export async function getDataset(id: number): Promise<DatasetDetail> {
  const { data } = await apiClient.get<ApiResponse<DatasetDetail>>(`/crm/datasets/${id}`);
  return data.data as DatasetDetail;
}

export async function createDataset(input: SaveDatasetInput): Promise<DatasetDetail> {
  const { data } = await apiClient.post<ApiResponse<DatasetDetail>>("/crm/datasets", input);
  return data.data as DatasetDetail;
}

export async function updateDataset(id: number, input: SaveDatasetInput): Promise<Dataset> {
  const { data } = await apiClient.put<ApiResponse<Dataset>>(`/crm/datasets/${id}`, input);
  return data.data as Dataset;
}

export async function deleteDataset(id: number): Promise<void> {
  await apiClient.delete(`/crm/datasets/${id}`);
}

export async function addColumn(datasetId: number, input: { name: string; dataType: CrmColumnType }): Promise<Column> {
  const { data } = await apiClient.post<ApiResponse<Column>>(`/crm/datasets/${datasetId}/columns`, input);
  return data.data as Column;
}

export async function renameColumn(columnId: number, name: string): Promise<Column> {
  const { data } = await apiClient.patch<ApiResponse<Column>>(`/crm/columns/${columnId}`, { name });
  return data.data as Column;
}

export async function deleteColumn(columnId: number): Promise<void> {
  await apiClient.delete(`/crm/columns/${columnId}`);
}

export async function listRows(datasetId: number, page: number, size: number, query: string): Promise<RowPage> {
  const { data } = await apiClient.get<ApiResponse<RowPage>>(`/crm/datasets/${datasetId}/rows`, {
    params: { page, size, q: query || undefined },
  });
  return data.data as RowPage;
}

export async function addRow(datasetId: number, values: Record<string, string>): Promise<Row> {
  const { data } = await apiClient.post<ApiResponse<Row>>(`/crm/datasets/${datasetId}/rows`, { values });
  return data.data as Row;
}

export async function updateRow(rowId: number, values: Record<string, string>): Promise<Row> {
  const { data } = await apiClient.patch<ApiResponse<Row>>(`/crm/rows/${rowId}`, { values });
  return data.data as Row;
}

export async function deleteRow(rowId: number): Promise<void> {
  await apiClient.delete(`/crm/rows/${rowId}`);
}

export async function previewImport(file: File): Promise<ImportPreview> {
  const body = new FormData();
  body.append("file", file);
  const { data } = await apiClient.post<ApiResponse<ImportPreview>>("/crm/imports/preview", body);
  return data.data as ImportPreview;
}

export async function importInto(datasetId: number, file: File, options: ImportOptions): Promise<ImportResult> {
  const body = new FormData();
  body.append("file", file);
  body.append("options", new Blob([JSON.stringify(options)], { type: "application/json" }));
  const { data } = await apiClient.post<ApiResponse<ImportResult>>(`/crm/datasets/${datasetId}/import`, body);
  return data.data as ImportResult;
}

export async function listAudit(): Promise<AuditEntry[]> {
  const { data } = await apiClient.get<ApiResponse<AuditEntry[]>>("/crm/audit");
  return data.data as AuditEntry[];
}

/** Downloads a file the server generates (an export or a template) and hands it to the browser as a save. */
async function download(path: string, fallbackName: string): Promise<void> {
  const response = await apiClient.get<Blob>(path, { responseType: "blob" });
  const disposition = String(response.headers["content-disposition"] ?? "");
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = match?.[1] ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportDataset(datasetId: number): Promise<void> {
  return download(`/crm/datasets/${datasetId}/export`, "export.xlsx");
}

export function downloadTemplate(kind: "xlsx" | "docx"): Promise<void> {
  return download(`/crm/templates/${kind}`, `orbit-crm-template.${kind}`);
}
