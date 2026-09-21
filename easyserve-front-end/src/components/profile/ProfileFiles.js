"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetUserFilesQuery, useUploadUserFileMutation } from "@/services/private/me";
import { FolderOpen, Upload, FileText, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ProfileFiles() {
  const { data, isLoading } = useGetUserFilesQuery();
  const [uploadFile, { isLoading: uploading }] = useUploadUserFileMutation();

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await uploadFile(formData).unwrap();
      toast.success("File uploaded successfully! 📁");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to upload file.");
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-xl max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </Card>
    );
  }

  const files = Array.isArray(data) ? data : data?.results || [];

  return (
    <Card className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-xl max-w-2xl">
      <CardHeader className="p-0 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-0.5 text-xs font-bold text-yellow-900 border border-yellow-400/30">
              <Sparkles className="h-3 w-3 text-yellow-600" /> Documents
            </span>
          </div>
          <CardTitle className="text-2xl font-black text-green-950 tracking-tight">
            Uploaded Files & Receipts
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Manage your customer documents and meal receipts.
          </CardDescription>
        </div>

        <label className="cursor-pointer shrink-0">
          <input type="file" hidden onChange={onUpload} disabled={uploading} />
          <span className="inline-flex items-center gap-2 rounded-xl bg-green-950 px-5 py-2.5 text-xs font-bold text-yellow-400 shadow-md transition hover:bg-green-900 active:scale-[0.98]">
            <Upload size={14} />
            {uploading ? "Uploading..." : "Upload New File"}
          </span>
        </label>
      </CardHeader>

      <CardContent className="p-0">
        {files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-10 text-center">
            <FolderOpen className="mx-auto mb-2 h-10 w-10 text-gray-300" />
            <p className="font-bold text-sm text-gray-700">No documents uploaded yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Uploaded receipts and meal vouchers will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-4 transition hover:bg-gray-100/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-yellow-600 shadow-xs">
                    <FileText size={18} />
                  </div>
                  <span className="truncate text-sm font-bold text-gray-800">
                    {file.name || "Customer Document"}
                  </span>
                </div>
                {file.file && (
                  <a
                    href={file.file}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-green-950 border border-gray-200 shadow-xs hover:bg-green-50"
                  >
                    <span>View</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
