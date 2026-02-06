// app/protected/not-found.tsx
'use client';

const ProtectedNotFound = () => {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600">404</h1>
        <p className="text-lg text-gray-600 mt-2">Protected Page Not Found</p>
      </div>
    </div>
  );
};

export default ProtectedNotFound;
