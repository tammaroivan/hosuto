import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpCircle,
  CheckCircle,
  XCircle,
  DownloadCloud,
  RefreshCw,
  ArrowUp,
  Search,
  ExternalLink,
} from "lucide-react";
import type { Stack } from "@hosuto/shared";
import { useStacks } from "../hooks/useStacks";
import { useSettings } from "../hooks/useSettings";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { cn } from "../lib/cn";
import { getImageUrl } from "../lib/docker";
import { Text } from "../components/ui/text";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/PageHeader";
import { SummaryStrip } from "../components/SummaryStrip";
import { FilterChips } from "../components/FilterChips";
import toast from "react-hot-toast";

type UpdateFilter = "all" | "has-updates" | "up-to-date" | "errors";

interface FlatImageRow {
  image: string;
  tag: string;
  currentDigest: string | null;
  remoteDigest: string | null;
  updateAvailable: boolean;
  error?: string;
  lastChecked: string | null;
  usedBy: Array<{ stackName: string; service: string }>;
}

const extractTag = (image: string): { name: string; tag: string } => {
  const atIdx = image.indexOf("@");
  const withoutDigest = atIdx !== -1 ? image.slice(0, atIdx) : image;

  const colonIdx = withoutDigest.lastIndexOf(":");
  if (colonIdx === -1 || withoutDigest.lastIndexOf("/") > colonIdx) {
    return { name: withoutDigest, tag: "latest" };
  }

  return { name: withoutDigest.slice(0, colonIdx), tag: withoutDigest.slice(colonIdx + 1) };
};

const truncateDigest = (digest: string | null): string => {
  if (!digest) {
    return "—";
  }
  if (digest.startsWith("sha256:")) {
    return digest.slice(0, 19);
  }

  return digest.slice(0, 12);
};

const buildImageRows = (stacks: Stack[]): FlatImageRow[] => {
  const imageMap = new Map<string, FlatImageRow>();

  for (const stack of stacks) {
    if (!stack.updates) {
      continue;
    }

    for (const result of stack.updates.results) {
      const existing = imageMap.get(result.image);

      if (existing) {
        existing.usedBy.push({ stackName: stack.name, service: result.service });
        if (result.updateAvailable) {
          existing.updateAvailable = true;
          existing.remoteDigest = result.remoteDigest;
        }
        if (result.error) {
          existing.error = result.error;
        }
      } else {
        const { name, tag } = extractTag(result.image);
        imageMap.set(result.image, {
          image: name,
          tag,
          currentDigest: result.currentDigest,
          remoteDigest: result.remoteDigest,
          updateAvailable: result.updateAvailable,
          error: result.error,
          lastChecked: stack.updates!.lastChecked,
          usedBy: [{ stackName: stack.name, service: result.service }],
        });
      }
    }
  }

  const rows = [...imageMap.values()];
  rows.sort((rowA, rowB) => {
    if (rowA.updateAvailable && !rowB.updateAvailable) {
      return -1;
    }
    if (!rowA.updateAvailable && rowB.updateAvailable) {
      return 1;
    }
    if (rowA.error && !rowB.error) {
      return -1;
    }
    if (!rowA.error && rowB.error) {
      return 1;
    }

    return rowA.image.localeCompare(rowB.image);
  });

  return rows;
};

const formatTimeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
};

const Updates = () => {
  const stacks = useStacks();
  const settings = useSettings();
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<UpdateFilter>("all");
  const [search, setSearch] = React.useState("");

  const imageRows = React.useMemo(() => {
    if (!stacks.data) {
      return [];
    }

    return buildImageRows(stacks.data);
  }, [stacks.data]);

  const filteredRows = React.useMemo(() => {
    let rows = imageRows;

    if (filter === "has-updates") {
      rows = rows.filter(row => row.updateAvailable);
    } else if (filter === "up-to-date") {
      rows = rows.filter(row => !row.updateAvailable && !row.error);
    } else if (filter === "errors") {
      rows = rows.filter(row => row.error);
    }

    if (search) {
      const query = search.toLowerCase();
      rows = rows.filter(
        row =>
          row.image.toLowerCase().includes(query) ||
          row.tag.toLowerCase().includes(query) ||
          row.usedBy.some(
            usage =>
              usage.stackName.toLowerCase().includes(query) ||
              usage.service.toLowerCase().includes(query),
          ),
      );
    }

    return rows;
  }, [imageRows, filter, search]);

  const updatesAvailable = imageRows.filter(row => row.updateAvailable).length;
  const errorsCount = imageRows.filter(row => row.error).length;
  const lastChecked = imageRows.find(row => row.lastChecked)?.lastChecked;

  const checkAll = useMutation({
    mutationFn: async () => {
      if (!stacks.data) {
        return;
      }

      await Promise.all(
        stacks.data
          .filter(stack => stack.entrypoint)
          .map(stack =>
            api.stacks[":name"]["check-updates"].$post({ param: { name: stack.name } }),
          ),
      );
    },
    onSuccess: () => toast.success("Checking all images for updates..."),
  });

  const updateStack = useMutation({
    mutationFn: async ({ stackName, services }: { stackName: string; services: string[] }) => {
      await api.stacks[":name"].update.$post({
        param: { name: stackName },
        json: { services },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stacks"] });
    },
  });

  const intervalLabel = settings.data?.updateCheckInterval
    ? formatInterval(settings.data.updateCheckInterval)
    : "—";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-5 pb-4">
        <PageHeader
          title="Updates"
          subtitle="Registry synchronization and image lifecycle management"
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => checkAll.mutate()}
                disabled={checkAll.isPending}
              >
                {checkAll.isPending ? "Checking..." : "Check All Now"}
              </Button>
              {updatesAvailable > 0 && (
                <Button variant="accent">
                  <ArrowUpCircle size={14} />
                  Update All ({updatesAvailable})
                </Button>
              )}
            </>
          }
        />

        <SummaryStrip
          className="mt-6"
          items={[
            {
              label: "Images Checked",
              value: (
                <Text size="xs" mono weight="bold" color="white">
                  {imageRows.length}
                </Text>
              ),
            },
            {
              label: "Updates Available",
              value: (
                <Text
                  size="xs"
                  mono
                  weight="bold"
                  color={updatesAvailable > 0 ? "accent" : "white"}
                >
                  {updatesAvailable}
                </Text>
              ),
            },
            {
              label: "Errors",
              value: (
                <Text size="xs" mono weight="bold" color={errorsCount > 0 ? "danger" : "white"}>
                  {errorsCount}
                </Text>
              ),
            },
            {
              label: "Last Checked",
              value: (
                <Text size="xs" weight="medium" color="secondary">
                  {lastChecked ? formatTimeAgo(lastChecked) : "—"}
                </Text>
              ),
            },
            {
              label: "Schedule",
              value: (
                <Text size="xs" color="secondary">
                  {intervalLabel}
                </Text>
              ),
            },
          ]}
        />
      </div>

      <div className="flex shrink-0 items-center gap-4 px-6 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Filter images..."
            className="w-full rounded-lg border border-border bg-surface-hover py-1.5 pl-9 pr-3 text-xs text-text-primary outline-none transition-colors focus:border-primary/50"
          />
        </div>
        <FilterChips
          options={["all", "has-updates", "up-to-date", "errors"] as const}
          value={filter}
          onChange={setFilter}
          labels={{ "has-updates": "Has Updates", "up-to-date": "Up to Date" }}
        />
      </div>

      <div className="custom-scroll flex-1 overflow-y-auto px-6 pb-8">
        {stacks.isLoading && <Text color="secondary">Loading...</Text>}

        {imageRows.length === 0 && !stacks.isLoading && (
          <Text color="secondary">No update data available. Run a check to scan images.</Text>
        )}

        {filteredRows.length > 0 && (
          <div className="blur-panel overflow-hidden rounded-xl">
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[9%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[22%]" />
                <col className="w-[9%]" />
                <col className="w-[6%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border/30 bg-white/[0.03]">
                  <th className="px-4 py-3">
                    <Text.Label>Image Name</Text.Label>
                  </th>
                  <th className="px-4 py-3">
                    <Text.Label>Tag</Text.Label>
                  </th>
                  <th className="px-4 py-3">
                    <Text.Label>Current</Text.Label>
                  </th>
                  <th className="px-4 py-3">
                    <Text.Label>Remote</Text.Label>
                  </th>
                  <th className="px-4 py-3">
                    <Text.Label>Status</Text.Label>
                  </th>
                  <th className="px-4 py-3">
                    <Text.Label>Used By</Text.Label>
                  </th>
                  <th className="px-4 py-3">
                    <Text.Label>Checked</Text.Label>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {filteredRows.map(row => (
                  <ImageRow
                    key={`${row.image}:${row.tag}`}
                    row={row}
                    onUpdate={(stackName, services) => updateStack.mutate({ stackName, services })}
                    isUpdating={updateStack.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredRows.length === 0 && imageRows.length > 0 && (
          <Text color="secondary">No images match your filter.</Text>
        )}
      </div>
    </div>
  );
};

const ImageRow = ({
  row,
  onUpdate,
  isUpdating,
}: {
  row: FlatImageRow;
  onUpdate: (stackName: string, services: string[]) => void;
  isUpdating: boolean;
}) => {
  const isUpToDate = !row.updateAvailable && !row.error;

  return (
    <tr className={cn("group transition-colors hover:bg-white/[0.02]", isUpToDate && "opacity-70")}>
      <td className="px-4 py-3 overflow-hidden" title={row.image}>
        <div className="flex items-center gap-2 min-w-0">
          <Text size="xs" mono weight="bold" color="white" truncate>
            {row.image}
          </Text>
          <a
            href={getImageUrl(row.image + ":" + row.tag)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </td>
      <td className="px-4 py-3 overflow-hidden" title={row.tag}>
        <Text size="xs" mono color="secondary" truncate className="block">
          {row.tag}
        </Text>
      </td>
      <td className="px-4 py-3 overflow-hidden" title={row.currentDigest ?? undefined}>
        <Text size="xs" mono color="secondary" truncate className="block">
          {truncateDigest(row.currentDigest)}
        </Text>
      </td>
      <td className="px-4 py-3 overflow-hidden" title={row.error ?? row.remoteDigest ?? undefined}>
        {row.error ? (
          <Text size="xs" mono color="danger" truncate className="block">
            Error
          </Text>
        ) : row.updateAvailable ? (
          <Text size="xs" mono color="accent" truncate className="block">
            {truncateDigest(row.remoteDigest)}
          </Text>
        ) : (
          <Text size="xs" mono color="secondary" truncate className="block">
            {truncateDigest(row.remoteDigest)}
          </Text>
        )}
      </td>
      <td className="px-4 py-3 overflow-hidden">
        {row.error ? (
          <div className="flex items-center gap-2">
            <XCircle size={14} className="shrink-0 text-danger" />
            <Text size="xs" weight="bold" color="danger" uppercase>
              Failed
            </Text>
          </div>
        ) : row.updateAvailable ? (
          <div className="flex items-center gap-2">
            <DownloadCloud size={14} className="shrink-0 text-primary" />
            <Text size="xs" weight="bold" color="accent" uppercase>
              Update
            </Text>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="shrink-0 text-success" />
            <Text size="xs" weight="bold" color="success" uppercase>
              Current
            </Text>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {row.usedBy.slice(0, 3).map(usage => (
            <Link
              key={`${usage.stackName}/${usage.service}`}
              to="/stacks/$stackName"
              params={{ stackName: usage.stackName }}
              className="rounded border border-border/50 bg-surface px-1.5 py-0.5 font-mono text-xs text-text-secondary transition-all hover:border-primary hover:text-primary"
            >
              {usage.stackName}/{usage.service}
            </Link>
          ))}
          {row.usedBy.length > 3 && (
            <Text
              size="xs"
              mono
              color="secondary"
              className="rounded border border-border/50 bg-surface px-1.5 py-0.5"
            >
              +{row.usedBy.length - 3} more
            </Text>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <Text size="xs" weight="medium" color="secondary">
          {row.lastChecked ? formatTimeAgo(row.lastChecked) : "—"}
        </Text>
      </td>
      <td className="px-4 py-3 text-right">
        {row.updateAvailable && (
          <button
            disabled={isUpdating}
            onClick={() =>
              onUpdate(
                row.usedBy[0].stackName,
                row.usedBy
                  .filter(usage => usage.stackName === row.usedBy[0].stackName)
                  .map(usage => usage.service),
              )
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-all hover:bg-primary hover:text-bg disabled:opacity-40"
          >
            <ArrowUp size={14} />
          </button>
        )}
        {row.error && (
          <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-all hover:text-white">
            <RefreshCw size={14} />
          </button>
        )}
      </td>
    </tr>
  );
};

const formatInterval = (seconds: number): string => {
  const hours = seconds / 3600;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Every ${days} ${days === 1 ? "day" : "days"}`;
  }

  return `Every ${hours} ${hours === 1 ? "hour" : "hours"}`;
};

export const Route = createFileRoute("/updates")({
  component: Updates,
});
