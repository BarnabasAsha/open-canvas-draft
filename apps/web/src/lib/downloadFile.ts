// No existing download/save-to-disk pattern anywhere else in the app to
// reuse — this is the standard Blob + object URL + throwaway <a download>
// technique, revoked right after the click so it doesn't leak.
export function downloadTextFile(fileName: string, content: string, mimeType = "text/html"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}
