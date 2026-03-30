export const blobToDataUrl = (blob?: Blob) => {
  if (!blob) return Promise.resolve(undefined);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

export const dataUrlToBlob = (dataUrl?: string) => {
  if (!dataUrl) return undefined;
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
};

export const toSafeFileName = (value: string, fallback: string) => {
  const cleaned = value.trim().replace(/[^a-z0-9-_]+/gi, "-");
  return cleaned || fallback;
};
