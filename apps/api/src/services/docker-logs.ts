import type { Readable } from "node:stream";
import { docker } from "./docker-client";

export interface LogLine {
  stream: "stdout" | "stderr";
  text: string;
  timestamp: string;
}

/**
 * Parses a Docker multiplexed log buffer into structured log lines.
 *
 * Each frame is expected to use Docker's 8-byte header format
 * (`[stream, 0, 0, 0, size(4 bytes)]`) followed by UTF-8 log content.
 * The function splits content by newline and returns one `LogLine` per line.
 *
 */
const parseDockerLogBuffer = (buffer: Buffer): LogLine[] => {
  const lines: LogLine[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      break;
    }

    const streamType = buffer[offset];
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;

    if (offset + size > buffer.length) {
      break;
    }

    const raw = buffer
      .subarray(offset, offset + size)
      .toString("utf8")
      .trimEnd();
    offset += size;

    if (!raw) {
      continue;
    }

    const stream = streamType === 2 ? "stderr" : "stdout";

    for (const line of raw.split("\n")) {
      if (!line) {
        continue;
      }

      const spaceIdx = line.indexOf(" ");
      const hasTimestamp = spaceIdx > 0 && line[spaceIdx - 1] === "Z";

      lines.push({
        stream,
        timestamp: hasTimestamp ? line.slice(0, spaceIdx) : new Date().toISOString(),
        text: hasTimestamp ? line.slice(spaceIdx + 1) : line,
      });
    }
  }

  return lines;
};

/**
 * Retrieves and parses logs for a Docker container.
 *
 */
export const getContainerLogs = async (containerId: string, tail: number): Promise<LogLine[]> => {
  const container = docker.getContainer(containerId);
  const buffer = await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
  });

  return parseDockerLogBuffer(buffer);
};

/**
 * Streams logs from a Docker container and emits parsed log lines.
 * Dockerode returns a Node Readable when `follow: true`, despite the type saying Buffer.
 *
 */
export const streamContainerLogs = (
  containerId: string,
  onData: (lines: LogLine[]) => void,
  onError: (error: Error) => void,
) => {
  let stream: Readable | null = null;
  let aborted = false;

  const start = async () => {
    try {
      const container = docker.getContainer(containerId);
      const raw = await container.logs({
        stdout: true,
        stderr: true,
        follow: true,
        tail: 0,
        timestamps: true,
      });

      if (aborted) {
        return;
      }

      // Dockerode returns a Readable stream when follow is true
      stream = raw as unknown as Readable;

      stream.on("data", (chunk: Buffer) => {
        const lines = parseDockerLogBuffer(chunk);
        if (lines.length > 0) {
          onData(lines);
        }
      });

      stream.on("error", onError);
    } catch (err) {
      if (!aborted) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  };

  start();

  return () => {
    aborted = true;
    stream?.removeAllListeners();
    stream?.destroy();
  };
};
