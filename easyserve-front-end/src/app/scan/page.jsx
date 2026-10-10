"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { motion } from "framer-motion";
import { QrCode, Camera, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
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
      const pathMatch = url.pathname.match(/\/restaurant\/([^/?]+)/);
      return {
        restaurant_id:
          url.searchParams.get("rid") ||
          url.searchParams.get("restaurant") ||
          (pathMatch ? pathMatch[1] : null),
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
              toast.error("Invalid QR Code. Please scan an EasyServe table QR.");
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

            toast.success("Table connected! 🎉");
            await navigateSafely("/dine-in/guests");
          } catch (err) {
            console.error("QR validation failed:", err);
            toast.error(
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
      toast.error("Camera access denied or unavailable. Please check camera permissions.");
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
    <div className="min-h-[85vh] flex items-center justify-center bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="rounded-3xl border border-gray-200/80 bg-white shadow-xl overflow-hidden">
          <CardHeader className="text-center p-6 sm:p-8 bg-green-950 text-white">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-lg">
              <QrCode className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-white">
              Scan Table QR Code
            </CardTitle>
            <CardDescription className="text-xs text-green-200 mt-1">
              Point your camera at the QR code on your table to open the dine-in menu
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="flex justify-center">
              <div
                id={QR_READER_ID}
                className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-yellow-400/80 bg-gray-900 shadow-inner"
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
              <Camera className="h-4 w-4 text-yellow-600" />
              <span>Align QR code within the frame</span>
            </div>

            <Button
              variant="outline"
              className="w-full h-11 rounded-2xl border-gray-200 font-bold hover:bg-gray-100 active:scale-[0.98]"
              onClick={() => navigateSafely("back")}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Cancel & Return
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
