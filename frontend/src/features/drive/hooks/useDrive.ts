import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/driveApi";

const STATUS_KEY = ["drive", "status"] as const;
const CATALOG_KEY = ["drive", "catalog"] as const;
const REQUESTS_KEY = ["drive", "access-requests"] as const;

export function useDriveStatus() {
  return useQuery({ queryKey: STATUS_KEY, queryFn: api.getConnectionStatus });
}

export function useCatalog() {
  return useQuery({ queryKey: CATALOG_KEY, queryFn: api.listCatalog });
}

export function useRegisterFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.registerFolder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATALOG_KEY }),
  });
}

export function useAccessRequests() {
  return useQuery({ queryKey: REQUESTS_KEY, queryFn: api.listAccessRequests });
}

export function useCreateAccessRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createAccessRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REQUESTS_KEY }),
  });
}

function useDecideRequest(mutationFn: (id: number) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REQUESTS_KEY }),
  });
}

export function useApproveAccessRequest() {
  return useDecideRequest(api.approveAccessRequest);
}

export function useRejectAccessRequest() {
  return useDecideRequest(api.rejectAccessRequest);
}
