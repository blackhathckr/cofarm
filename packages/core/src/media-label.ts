function plural(count: number, one: string, many: string): string {
  return `${String(count)} ${count === 1 ? one : many}`;
}

export function mediaLabel(photoCount: number, videoCount: number): string | null {
  const parts = [
    photoCount > 0 ? plural(photoCount, 'photo', 'photos') : null,
    videoCount > 0 ? plural(videoCount, 'video', 'videos') : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? null : parts.join(' · ');
}
