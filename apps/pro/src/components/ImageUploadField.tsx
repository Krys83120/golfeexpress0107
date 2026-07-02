import React, { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

interface ImageUploadFieldProps {
  currentImageUrl?: string | null;
  placeholder: string; // emoji ou texte affiché si aucune image
  shape?: "square" | "circle" | "banner";
  onUpload: (file: File) => Promise<void>;
}

const SHAPE_CLASSES: Record<NonNullable<ImageUploadFieldProps["shape"]>, string> = {
  square: "h-24 w-24 rounded-sm",
  circle: "h-24 w-24 rounded-full",
  banner: "h-40 w-full rounded-sm",
};

export function ImageUploadField({ currentImageUrl, placeholder, shape = "square", onUpload }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload.");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const displayUrl = previewUrl ?? currentImageUrl;

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`group relative flex items-center justify-center overflow-hidden border-2 border-dashed border-gris-light bg-gris-light transition-colors hover:border-golfe-green ${SHAPE_CLASSES[shape]}`}
      >
        {displayUrl ? (
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl">{placeholder}</span>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-white" />
          ) : (
            <Camera size={18} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </div>
      </button>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
