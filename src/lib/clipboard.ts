export async function copyToClipboard(text: string, autoClearMs = 30_000): Promise<void> {
  await navigator.clipboard.writeText(text);
  if (autoClearMs > 0) {
    setTimeout(() => {
      navigator.clipboard.writeText('').catch(() => {});
    }, autoClearMs);
  }
}
