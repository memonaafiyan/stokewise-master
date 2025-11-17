import { useEffect, useRef, useState } from "react";
import Quagga from "quagga";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);

  const startScanner = () => {
    if (!scannerRef.current) return;

    Quagga.init(
      {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment",
          },
        },
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader",
          ],
        },
      },
      (err) => {
        if (err) {
          console.error(err);
          toast.error("Failed to start camera");
          return;
        }
        Quagga.start();
      }
    );

    Quagga.onDetected((result) => {
      const code = result.codeResult.code;
      if (code) {
        onScan(code);
        stopScanner();
        toast.success(`Barcode detected: ${code}`);
      }
    });
  };

  const stopScanner = () => {
    Quagga.stop();
    setIsScanning(false);
  };

  useEffect(() => {
    if (isScanning) {
      startScanner();
    }
    return () => {
      Quagga.stop();
    };
  }, [isScanning]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsScanning(true)}
        className="w-full"
      >
        <Camera className="h-4 w-4 mr-2" />
        Scan Barcode
      </Button>

      <Dialog open={isScanning} onOpenChange={setIsScanning}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
            <DialogDescription>
              Position the barcode in front of the camera
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <div ref={scannerRef} className="w-full h-[400px] bg-black rounded-lg overflow-hidden" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={stopScanner}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
