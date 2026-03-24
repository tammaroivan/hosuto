import type { WSContext } from "hono/ws";
import type Dockerode from "dockerode";
import { docker, dockerSocketPath } from "./docker-client";
import { connect, type Socket } from "node:net";

export interface ExecSession {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  cleanup: () => void;
}

const wsSend = (ws: WSContext, message: object) => {
  try {
    ws.send(JSON.stringify(message));
  } catch (error) {
    console.warn("Failed to send WebSocket message:", error);
  }
};

/**
 * Creates a Docker exec instance via Dockerode's callback API.
 * The promise-based API hangs in Bun, so we wrap the callback form.
 */
const createExec = (containerId: string): Promise<Dockerode.Exec> => {
  return new Promise((resolve, reject) => {
    docker.getContainer(containerId).exec(
      {
        Cmd: ["/bin/sh"],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
      },
      (error, exec) => {
        if (error || !exec) {
          reject(error || new Error("Failed to create exec"));
        } else {
          resolve(exec);
        }
      },
    );
  });
};

/**
 * Starts an exec instance via a raw HTTP upgrade on the Docker socket.
 * Dockerode's hijack mode doesn't work in Bun, so we talk to the
 * Docker Engine API directly to get a bidirectional TCP stream.
 */
const startExecStream = (execId: string): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    let settled = false;

    const body = JSON.stringify({ Tty: true, Detach: false });
    const request = [
      `POST /exec/${execId}/start HTTP/1.1`,
      "Host: localhost",
      "Content-Type: application/json",
      "Connection: Upgrade",
      "Upgrade: tcp",
      `Content-Length: ${Buffer.byteLength(body)}`,
      "",
      body,
    ].join("\r\n");

    const socket = connect(dockerSocketPath, () => {
      socket.write(request);
    });

    // Read until we find the end of HTTP headers, then hand off the raw socket
    let headerBuffer = "";
    const onData = (chunk: Buffer) => {
      headerBuffer += chunk.toString();
      const headerEnd = headerBuffer.indexOf("\r\n\r\n");

      if (headerEnd >= 0) {
        socket.removeListener("data", onData);
        const remaining = Buffer.from(headerBuffer.slice(headerEnd + 4));

        if (remaining.length > 0) {
          socket.unshift(remaining);
        }

        settled = true;
        socket.setTimeout(0);
        resolve(socket);
      }
    };

    socket.on("data", onData);
    socket.on("error", error => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    socket.setTimeout(5000, () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error("Exec start timed out"));
      }
    });
  });
};

/**
 * Creates and starts a Docker exec session, returning handlers for
 * writing stdin, resizing the terminal, and cleaning up.
 */
export const startExecSession = async (
  containerId: string,
  ws: WSContext,
): Promise<ExecSession> => {
  const exec = await createExec(containerId);
  const socket = await startExecStream(exec.id);

  socket.on("data", (chunk: Buffer) => {
    wsSend(ws, { type: "exec:output", data: chunk.toString() });
  });

  socket.on("end", () => {
    wsSend(ws, { type: "exec:exit" });
  });

  socket.on("error", error => {
    console.warn("Exec socket error:", error);
    wsSend(ws, { type: "exec:exit" });
  });

  return {
    write: (data: string) => {
      socket.write(data);
    },
    resize: (cols: number, rows: number) => {
      exec.resize({ h: rows, w: cols }).catch(error => {
        console.warn("Exec resize failed:", error);
      });
    },
    cleanup: () => {
      socket.destroy();
    },
  };
};
