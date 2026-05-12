import dayjs from "dayjs";

export function getNowDate() {
  return dayjs().format("YYYY/MM/DD");
}

export function getNowDateTime() {
  return dayjs().format("YYYY/MM/DD HH:mm:ss");
}

export function getNowDateTimeForFlieName() {
  return dayjs().format("YYYYMMDDHHmmss");
}

export function getDateStr(date) {
  const d = dayjs(date);
  if (d.isSame(dayjs(), "day")) {
    return "今天";
  } else if (d.isSame(dayjs().add(-1, "day"), "day")) {
    return "昨天";
  } else if (d.isSame(dayjs().add(-2, "day"), "day")) {
    return "前天";
  } else if (d.isAfter(dayjs().add(-1, "year"), "year")) {
    return d.format("MM月DD日");
  } else {
    return d.format("YYYY年MM月DD日");
  }
}

export function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
