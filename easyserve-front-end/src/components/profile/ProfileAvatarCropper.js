"use client";

import Cropper from "react-easy-crop";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AvatarCropper({ image, onClose }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const onSave = async () => {
    // TODO:
    // 1. Convert cropped area to blob
    // 2. Upload to backend (/user/me/ avatar endpoint)
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <Card className="w-[90vw] max-w-md p-4 space-y-4">
        <h3 className="font-semibold text-lg">Crop your avatar</h3>

        <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}
