// app/unauthorized/page.tsx
'use client';

const Unauthorized = () => {
  return (
    <div className="flex flex-col justify-center items-center h-screen text-center">
      <h1 className="text-4xl font-bold text-yellow-600">Unauthorized</h1>
      <p className="text-gray-500 mt-2 text-lg">
        You don’t have access to this page.
      </p>
    </div>
  );
};

export default Unauthorized;
