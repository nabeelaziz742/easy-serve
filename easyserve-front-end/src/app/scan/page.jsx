"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useValidateTableMutation } from "@/services/public/dineIn";
import { useDispatch } from "react-redux";
import { setDineInContext } from "@/store/slices/dineInSlice";

const QR_READER_ID = "qr-reader";

export default function ScanQRPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [validateTable] = useValidateTableMutation();

  const scannerRef = useRef(null);
  const startedRef = useRef(false);
  const processingRef = useRef(false);

  const safeStopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    startedRef.current = false;

    if (!scanner) return;

    try {
      const state = scanner.getState();
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch {
      // ignore scanner shutdown errors
    } finally {
      stopMediaTracks();
      try {
        scanner.clear();
      } catch {
        // ignore
      }
    }
  }, []);

  const stopMediaTracks = () => {
    const video = document.querySelector(`#${QR_READER_ID} video`);
    if (!video?.srcObject) return;

    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };

  const navigateSafely = useCallback(
    async (to) => {
      await safeStopScanner();
      if (to === "back") router.back();
      else router.push(to);
    },
    [router, safeStopScanner]
  );

  const parseQRData = (text) => {
    const clean = text.trim();

    if (clean.startsWith("http")) {
      const url = new URL(clean);
      return {
        restaurant_id:
          url.searchParams.get("rid") ||
          url.searchParams.get("restaurant"),
        table_number: url.searchParams.get("table"),
      };
    }

    const parts = clean.split("&");
    const data = {};

    parts.forEach((part) => {
      const [key, value] = part.split("=");
      if (key && value) data[key.trim().toUpperCase()] = value.trim();
    });

    return {
      restaurant_id: data.RESTAURANT,
      table_number: data.TABLE,
    };
  };

  const startScanner = useCallback(async () => {
    if (startedRef.current) return;

    const scanner = new Html5Qrcode(QR_READER_ID);
    scannerRef.current = scanner;
    // Set this BEFORE starting the camera. QR callbacks can fire immediately
    // after the scanner starts, before scanner.start() resolves.
    startedRef.current = true;

    const container = document.getElementById(QR_READER_ID);
    const size = container?.clientWidth || 280;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: Math.floor(size * 0.7),
          videoConstraints: {
            facingMode: "environment",
            aspectRatio: 1,
          },
        },
        async (decodedText) => {
          if (!startedRef.current || processingRef.current) return;
          processingRef.current = true;

          try {
            const parsed = parseQRData(decodedText);

            if (!parsed.restaurant_id || !parsed.table_number) {
              alert("Invalid QR Code");
              processingRef.current = false;
              return;
            }

            const response = await validateTable({
              restaurant: parsed.restaurant_id,
              table: parsed.table_number,
            }).unwrap();

            dispatch(
              setDineInContext({
                ...response,
                guests: null,
              })
            );

            await navigateSafely("/dine-in/guests");
          } catch (err) {
            console.error("QR validation failed:", err);
            alert(
              err?.data?.detail ||
                "Unable to validate this table. Please try again."
            );
            processingRef.current = false;
          }
        },
        () => {
          // Ignore normal frame-by-frame scan failures.
        }
      );
    } catch (err) {
      startedRef.current = false;
      scannerRef.current = null;
      console.error("QR Scanner Error:", err);
      alert("Unable to access camera");
    }
  }, [dispatch, navigateSafely, validateTable]);

  useEffect(() => {
    startScanner();

    return () => {
      processingRef.current = false;
      safeStopScanner();
    };
  }, [startScanner, safeStopScanner]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Scan Table QR Code</CardTitle>
          <CardDescription>
            Point your camera at the QR code on your table
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div
              id={QR_READER_ID}
              className="w-full max-w-75 aspect-square rounded-xl overflow-hidden border"
            />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigateSafely("back")}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
