"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

interface StudentIdBadgeProps {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    photo?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    schoolId: string;
  };
  schoolName?: string;
  showQR?: boolean;
  showBarcode?: boolean;
}

export function StudentIdBadge({
  student,
  schoolName = "LeoneSIS",
  showQR = true,
  showBarcode = true,
}: StudentIdBadgeProps) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (qrRef.current && showQR) {
      QRCode.toCanvas(qrRef.current, student.id, {
        width: 80,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [student.id, showQR]);

  useEffect(() => {
    if (barcodeRef.current && showBarcode) {
      try {
        JsBarcode(barcodeRef.current, student.id.substring(0, 12).replace(/-/g, ""), {
          format: "CODE128",
          width: 1.5,
          height: 30,
          displayValue: true,
          fontSize: 12,
          margin: 0,
        });
      } catch {
        // barcode generation can fail on invalid chars
      }
    }
  }, [student.id, showBarcode]);

  return (
    <div className="inline-flex flex-col items-center border-2 border-emerald-600 rounded-xl p-4 bg-white shadow-lg" style={{ width: "340px" }}>
      <div className="w-full bg-gradient-to-r from-emerald-600 to-sky-500 text-white text-center py-2 rounded-t-lg -mt-4 -mx-4 mb-3">
        <h3 className="font-bold text-sm">{schoolName}</h3>
        <p className="text-[10px] opacity-80">Student Identification Card</p>
      </div>
      <div className="flex items-center gap-4 mb-3">
        {student.photo ? (
          <img src={student.photo} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-emerald-300" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center text-white text-2xl font-bold">
            {student.firstName[0]}{student.lastName[0]}
          </div>
        )}
        <div>
          <p className="font-bold text-lg">{student.firstName} {student.lastName}</p>
          {student.gender && <p className="text-sm text-gray-600">{student.gender}</p>}
          {student.dateOfBirth && (
            <p className="text-sm text-gray-600">DOB: {new Date(student.dateOfBirth).toLocaleDateString()}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 mb-3">
        {showQR && <canvas ref={qrRef} className="border rounded" />}
        {showBarcode && (
          <div className="flex-1">
            <svg ref={barcodeRef} />
          </div>
        )}
      </div>
      <div className="w-full bg-gray-100 rounded-b-lg -mb-4 -mx-4 mt-2 p-2 text-center">
        <p className="text-[10px] text-gray-500">ID: {student.id}</p>
      </div>
    </div>
  );
}
