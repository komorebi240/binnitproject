import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/crmApi";
import type { CrmColumnType, ImportOptions, SaveDatasetInput } from "../types";

const DATASETS_KEY = ["crm", "datasets"] as const;
const datasetKey = (id: number) => ["crm", "dataset", id] as const;
const rowsKey = (id: number) => ["crm", "rows", id] as const;
const AUDIT_KEY = ["crm", "audit"] as const;

export function useDatasets() {
  return useQuery({ queryKey: DATASETS_KEY, queryFn: api.listDatasets });
}

export function useDataset(id: number) {
  return useQuery({ queryKey: datasetKey(id), queryFn: () => api.getDataset(id) });
}

export function useRows(datasetId: number, page: number, size: number, query: string) {
  return useQuery({
    queryKey: [...rowsKey(datasetId), page, size, query],
    queryFn: () => api.listRows(datasetId, page, size, query),
    // The old page stays on screen while the next one loads, so paging and searching do not flash an empty table.
    placeholderData: keepPreviousData,
  });
}

export function useAudit() {
  return useQuery({ queryKey: AUDIT_KEY, queryFn: api.listAudit });
}

/** Everything about a dataset (its columns, its customers, the counts in the list) is read again after a change. */
function useRefresh() {
  const queryClient = useQueryClient();
  return (datasetId: number) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: DATASETS_KEY }),
      queryClient.invalidateQueries({ queryKey: datasetKey(datasetId) }),
      queryClient.invalidateQueries({ queryKey: rowsKey(datasetId) }),
      queryClient.invalidateQueries({ queryKey: AUDIT_KEY }),
    ]);
}

export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveDatasetInput) => api.createDataset(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DATASETS_KEY }),
  });
}

export function useUpdateDataset(datasetId: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: SaveDatasetInput) => api.updateDataset(datasetId, input),
    onSuccess: () => refresh(datasetId),
  });
}

export function useDeleteDataset(datasetId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteDataset(datasetId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: datasetKey(datasetId) });
      queryClient.removeQueries({ queryKey: rowsKey(datasetId) });
      return queryClient.invalidateQueries({ queryKey: DATASETS_KEY });
    },
  });
}

export function useAddColumn(datasetId: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { name: string; dataType: CrmColumnType }) => api.addColumn(datasetId, input),
    onSuccess: () => refresh(datasetId),
  });
}

export function useRenameColumn(datasetId: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ columnId, name }: { columnId: number; name: string }) => api.renameColumn(columnId, name),
    onSuccess: () => refresh(datasetId),
  });
}

export function useDeleteColumn(datasetId: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (columnId: number) => api.deleteColumn(columnId),
    onSuccess: () => refresh(datasetId),
  });
}

export function useAddRow(datasetId: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (values: Record<string, string>) => api.addRow(datasetId, values),
    onSuccess: () => refresh(datasetId),
  });
}

export function useUpdateRow(datasetId: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ rowId, values }: { rowId: number; values: Record<string, string> }) => api.updateRow(rowId, values),
    onSuccess: () => refresh(datasetId),
  });
}

export function useDeleteRow(datasetId: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (rowId: number) => api.deleteRow(rowId),
    onSuccess: () => refresh(datasetId),
  });
}

export function usePreviewImport() {
  return useMutation({ mutationFn: (file: File) => api.previewImport(file) });
}

export function useImport(datasetId: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ file, options }: { file: File; options: ImportOptions }) => api.importInto(datasetId, file, options),
    onSuccess: () => refresh(datasetId),
  });
}

export function useExportDataset(datasetId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.exportDataset(datasetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUDIT_KEY }),
  });
}

export function useDownloadTemplate() {
  return useMutation({ mutationFn: (kind: "xlsx" | "docx") => api.downloadTemplate(kind) });
}
