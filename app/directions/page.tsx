import { Suspense } from "react";
import DirectionsClientComponent from "./DirectionsClientComponent";

function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
      <div className="text-xl font-semibold text-gray-700">
        Loading route information...
      </div>
    </div>
  );
}

export default function DirectionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DirectionsClientComponent />
    </Suspense>
  );
}