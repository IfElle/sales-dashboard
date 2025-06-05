"use client";
import { useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { UploadCloud } from "lucide-react";

export default function UploadButton({ onUpload }: { onUpload: (file: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onUpload(file);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button onClick={() => fileInputRef.current?.click()}>
        <UploadCloud className="w-4 h-4 mr-2" /> Upload Excel
      </Button>
      {fileName && <span className="text-sm text-gray-600">{fileName}</span>}
    </div>
  );
}
