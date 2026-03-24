import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { api } from "../lib/api";

type SaveSuccess = InferResponseType<(typeof api.files)[":stackName"]["content"]["$put"], 200>;
type SaveError = InferResponseType<(typeof api.files)[":stackName"]["content"]["$put"], 400 | 403>;

type ValidateSuccess = InferResponseType<
  (typeof api.files)[":stackName"]["validate"]["$post"],
  200
>;
type ValidateError = InferResponseType<(typeof api.files)[":stackName"]["validate"]["$post"], 404>;

type ApplySuccess = InferResponseType<(typeof api.files)[":stackName"]["apply"]["$post"], 200>;
type ApplyError = InferResponseType<(typeof api.files)[":stackName"]["apply"]["$post"], 404 | 500>;

type RenameSuccess = InferResponseType<(typeof api.files)[":stackName"]["rename"]["$post"], 200>;
type RenameError = InferResponseType<
  (typeof api.files)[":stackName"]["rename"]["$post"],
  400 | 403
>;

export const useSaveFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stackName,
      relativePath,
      content,
    }: {
      stackName: string;
      relativePath: string;
      content: string;
    }) => {
      const res = await api.files[":stackName"].content.$put({
        param: { stackName },
        json: { path: relativePath, content },
      });

      if (!res.ok) {
        const body = (await res.json()) as SaveError;
        throw new Error(body.error);
      }

      return (await res.json()) as SaveSuccess;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["stack-files", variables.stackName],
      });
    },
  });
};

export const useValidateStack = () => {
  return useMutation({
    mutationFn: async ({
      stackName,
      files,
    }: {
      stackName: string;
      files?: Record<string, string>;
    }) => {
      const res = await api.files[":stackName"].validate.$post({
        param: { stackName },
        json: { files: files ?? {} },
      });

      if (!res.ok) {
        const body = (await res.json()) as ValidateError;
        throw new Error(body.error);
      }

      return (await res.json()) as ValidateSuccess;
    },
  });
};

export const useApplyStack = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stackName }: { stackName: string }) => {
      const res = await api.files[":stackName"].apply.$post({
        param: { stackName },
      });

      if (!res.ok) {
        const body = (await res.json()) as ApplyError;
        throw new Error(body.error);
      }

      return (await res.json()) as ApplySuccess;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stacks"] });
    },
  });
};

export const useRenameFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stackName,
      oldPath,
      newPath,
    }: {
      stackName: string;
      oldPath: string;
      newPath: string;
    }) => {
      const res = await api.files[":stackName"].rename.$post({
        param: { stackName },
        json: { oldPath, newPath },
      });

      if (!res.ok) {
        const body = (await res.json()) as RenameError;
        throw new Error(body.error);
      }

      return (await res.json()) as RenameSuccess;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["stack-files", variables.stackName],
      });
    },
  });
};
