'use client';

import { useDropzone } from 'react-dropzone';

export default function DragDropUpload({
  onFileSelect,
  label = 'Drag & drop file here, or click to select',
  accept = { '*/*': [] },
}: {
  onFileSelect: (file: File) => void;
  label?: string;
  accept?: Record<string, string[]>;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles: 1,
    onDrop: (files) => files[0] && onFileSelect(files[0]),
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors text-center
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
      `}
    >
      <input {...getInputProps()} />
      <p className="text-gray-600 text-sm">{label}</p>
    </div>
  );
}
