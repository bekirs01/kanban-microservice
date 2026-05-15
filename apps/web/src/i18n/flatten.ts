export interface MessageTree {
  [key: string]: string | MessageTree;
}

export function flattenDict(
  tree: MessageTree,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object") {
      Object.assign(result, flattenDict(val as MessageTree, path));
      continue;
    }
    result[path] = String(val);
  }
  return result;
}
