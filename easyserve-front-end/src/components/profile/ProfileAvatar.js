"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import AvatarCropper from "./ProfileAvatarCropper";

export default function ProfileAvatar({ user }) {
  const fileInputRef = useRef(null);
  const [cropImage, setCropImage] = useState(null);

  const imageUrl = user?.profile?.image_url;
  const initials =
    `${user?.profile?.first_name?.[0] || ""}${user?.profile?.last_name?.[0] || ""}` ||
    user?.username?.[0]?.toUpperCase();

  const openFilePicker = () => {
    fileInputRef.current.click();
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setCropImage(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div
        onClick={openFilePicker}
        className="relative w-28 h-28 rounded-full cursor-pointer group"
      >
        {/* Avatar */}
        {imageUrl ? (
          <Image
              src={imageUrl}
              alt="Profile"
              width={112}
              height={112}
              unoptimized
              className="rounded-full object-cover"
            />

        ) : (
          <div className="w-full h-full rounded-full bg-linear-to-br from-green-700 to-green-900 flex items-center justify-center text-white text-3xl font-bold">
            {initials}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <Camera className="text-white w-6 h-6" />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onFileChange}
        />
      </div>

      {/* Cropper Modal */}
      {cropImage && (
        <AvatarCropper
          image={cropImage}
          onClose={() => setCropImage(null)}
        />
      )}
    </>
  );
}
