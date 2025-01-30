export function stringify<T>(data: T): string {
  switch (typeof data) {
    case "number":
    case "bigint":
    case "boolean":
      return data.toString();
    case "undefined":
      return "";
    case "object":
      return JSON.stringify(data);
    default:
      return data as string;
  }
}
