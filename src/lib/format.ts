const tz = 'Asia/Shanghai';

export function formatDate(d: Date): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d)
    .reduce<Record<string, string>>((a, x) => ((a[x.type] = x.value), a), {});
  return `${p.year}.${p.month}.${p.day}`;
}

export function isoDate(d: Date): string {
  return formatDate(d).replaceAll('.', '-');
}

const tagNames: Record<string, string> = { ssh: 'SSH', ci: 'CI', git: 'Git', rabbitmq: 'RabbitMQ' };
export function tagLabel(tag: string): string {
  return tagNames[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1);
}
