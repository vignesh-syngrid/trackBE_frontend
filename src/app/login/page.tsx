'use client';

import { useState } from 'react';
import { useAuth } from '../../utils/AuthContext';
import Image from 'next/image';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('superadmin@itrack.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-4"
      style={{
        backgroundImage: "url('/assets/waves.png')",
        backgroundColor: '#0047AB',
      }}
    >
      {/* Logo Section */}
      <div className="mb-6 text-center">
        <Image
          {/* src="/assets/itrack-logo.svg" */}
          src="/assets/syngrid_fulllogo.png"
          alt="iTrack Logo"
          width={160}
          height={40}
          className="mx-auto"
        />
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
          Login to your account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="info@company.com"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>
              <a href="#" className="text-sm text-blue-500 hover:underline">
                Forgot ?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span
                className="absolute right-3 top-2.5 text-gray-500 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition button-click-effect"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
