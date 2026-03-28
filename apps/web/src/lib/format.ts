export const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (isToday) {
    return time;
  }

  const day = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return `${day} ${time}`;
};

export const formatLogTimestamp = (iso: string): string => {
  const date = new Date(iso);

  const day = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return `${day} ${time}`;
};

export const formatUptime = (raw: string): string => {
  if (raw.startsWith("Up since ")) {
    const iso = raw.slice("Up since ".length);
    const started = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - started.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const h = hours % 24;
      return `${days} ${days === 1 ? "day" : "days"}${h > 0 ? `, ${h} ${h === 1 ? "hour" : "hours"}` : ""}`;
    }

    if (hours > 0) {
      const m = minutes % 60;
      return `${hours} ${hours === 1 ? "hour" : "hours"}${m > 0 ? `, ${m} min` : ""}`;
    }

    return `${minutes} min`;
  }

  return raw;
};

export const formatMB = (bytes: number): string => {
  if (bytes === 0) {
    return "0 MB";
  }

  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }

  return `${Math.round(mb)} MB`;
};
