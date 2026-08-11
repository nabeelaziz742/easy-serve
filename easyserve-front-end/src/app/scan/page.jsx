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

  const navigateSafely = async (to) => {
    await safeStopScanner();

    if (to === "back") {
      router.back();
    } else {
      router.push(to);
    }
  };

  const router = useRouter();
  const dispatch = useDispatch();
  const [validateTable] = useValidateTableMutation();

  const scannerRef = useRef(null);
  const startedRef = useRef(false);

  /* -------------------------
     QR DATA PARSER
  -------------------------- */
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
      if (key && value) {
        data[key.trim().toUpperCase()] = value.trim();
      }
    });

    return {
      restaurant_id: data.RESTAURANT,
      table_number: data.TABLE,
    };
  };

  /* -------------------------
     START SCANNER
  -------------------------- */
  const startScanner = useCallback(async () => {
    if (startedRef.current) return;

    const scanner = new Html5Qrcode(QR_READER_ID);
    scannerRef.current = scanner;

    const container = document.getElementById(QR_READER_ID);
    const size = container?.clientWidth || 280;

    const config = {
      fps: 10,
      qrbox: Math.floor(size * 0.7),
      videoConstraints: {
        facingMode: "environment",
        aspectRatio: 1,
      },
    };

    try {
      await scanner.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (!startedRef.current) return;

          await safeStopScanner();

          const parsed = parseQRData(decodedText);

          if (!parsed.restaurant_id || !parsed.table_number) {
            alert("Invalid QR Code");
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

          // router.push("/dine-in/guests");

          await navigateSafely("/dine-in/guests");

        }
      );

      startedRef.current = true;
    } catch (err) {
      console.error("QR Scanner Error:", err);
      alert("Unable to access camera");
    }
  }, [dispatch, router, validateTable]);

  const safeStopScanner = async () => {
    if (!scannerRef.current) return;

    try {
      const state = scannerRef.current.getState();

      if (state === 2 || state === 3) {
        await scannerRef.current.stop();
      }
    } catch {
      // ignore
    } finally {
      stopMediaTracks();   // 🔥 HARD CAMERA OFF
      scannerRef.current.clear();
      scannerRef.current = null;
      startedRef.current = false;
    }
  };

  const stopMediaTracks = () => {
    const video = document.querySelector(`#${QR_READER_ID} video`);

    if (!video || !video.srcObject) return;

    const stream = video.srcObject;
    const tracks = stream.getTracks();

    tracks.forEach((track) => track.stop());

    video.srcObject = null;
  };


  /* -------------------------
     LIFECYCLE
  -------------------------- */
  useEffect(() => {
    startScanner();

    return () => {
      safeStopScanner();
    };
  }, [startScanner]);

  /* -------------------------
     UI
  -------------------------- */
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
