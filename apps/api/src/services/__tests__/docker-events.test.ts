import { describe, it, expect } from "vitest";
import { parseDockerEventChunk } from "../docker-events";

function makeDockerEvent(action: string, id = "abc123", name = "test-container") {
  return JSON.stringify({
    Type: "container",
    Action: action,
    Actor: {
      ID: id,
      Attributes: {
        name,
        "com.docker.compose.project": "my-stack",
      },
    },
  });
}

describe("parseDockerEventChunk", () => {
  it("parses a single event", () => {
    const chunk = makeDockerEvent("start");
    const messages = parseDockerEventChunk(chunk);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      type: "container:status",
      payload: {
        id: "abc123",
        name: "test-container",
        action: "start",
        stackName: "my-stack",
      },
    });
  });

  it("parses multiple newline-delimited events in a single chunk", () => {
    const chunk = [
      makeDockerEvent("start", "aaa", "nginx"),
      makeDockerEvent("restart", "aaa", "nginx"),
    ].join("\n");

    const messages = parseDockerEventChunk(chunk);

    expect(messages).toHaveLength(2);
    expect(messages[0].payload.action).toBe("start");
    expect(messages[1].payload.action).toBe("restart");
    expect(messages[0].payload.id).toBe("aaa");
  });

  it("handles trailing newline", () => {
    const chunk = makeDockerEvent("stop") + "\n";
    const messages = parseDockerEventChunk(chunk);

    expect(messages).toHaveLength(1);
    expect(messages[0].payload.action).toBe("stop");
  });

  it("skips malformed lines and parses valid ones", () => {
    const chunk = [
      "not valid json",
      makeDockerEvent("die", "bbb", "redis"),
      "{also broken",
    ].join("\n");

    const messages = parseDockerEventChunk(chunk);

    expect(messages).toHaveLength(1);
    expect(messages[0].payload).toEqual({
      id: "bbb",
      name: "redis",
      action: "die",
      stackName: "my-stack",
    });
  });

  it("returns empty array for empty chunk", () => {
    expect(parseDockerEventChunk("")).toEqual([]);
    expect(parseDockerEventChunk("\n")).toEqual([]);
  });

  it("sets stackName to null when compose project label is missing", () => {
    const chunk = JSON.stringify({
      Type: "container",
      Action: "start",
      Actor: { ID: "ccc", Attributes: { name: "standalone" } },
    });

    const messages = parseDockerEventChunk(chunk);

    expect(messages).toHaveLength(1);
    expect(messages[0].payload.stackName).toBeNull();
  });
});
