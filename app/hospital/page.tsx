import { Suspense } from "react";
import HospitalClientComponent from './HospitalClientComponent';

// Loading UI component
function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
      <div className="text-xl font-semibold text-gray-700">
        Loading hospital information...
      </div>
    </div>
  );
}

export default function HospitalPage() {
  return (
    <Suspense fallback={<Loading />}>
      <HospitalClientComponent />
    </Suspense>
  );
}
