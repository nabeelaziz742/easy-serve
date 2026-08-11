"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetUserFilesQuery, useUploadUserFileMutation } from "@/services/private/me";

export default function ProfileFiles() {
  const { data, isLoading } = useGetUserFilesQuery();
  const [uploadFile] = useUploadUserFileMutation();

  const onUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    await uploadFile(formData);
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card className="p-6">
      <div className="flex justify-between mb-4">
        <h3 className="font-semibold">Uploaded Files</h3>

        <label>
          <input
            type="file"
            hidden
            onChange={onUpload}
          />
          <Button>Upload File</Button>
        </label>
      </div>

      {!data?.length ? (
        <p className="text-gray-500">No files uploaded</p>
      ) : (
        <ul className="space-y-2">
          {data.map((file) => (
            <li
              key={file.id}
              className="flex justify-between border p-3 rounded-md"
            >
              <span>{file.name}</span>
              <a
                href={file.file}
                target="_blank"
                className="text-blue-600"
              >
                View
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
