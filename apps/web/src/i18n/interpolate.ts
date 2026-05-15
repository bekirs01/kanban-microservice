export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (vars[name] === undefined || vars[name] === null) return match;
    return String(vars[name]);
  });
}
