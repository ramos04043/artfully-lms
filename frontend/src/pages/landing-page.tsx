import { Link } from 'react-router-dom'
import { Building2, Users, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="inline-block bg-white rounded-2xl p-4 shadow-lg mb-6">
            <div className="text-5xl">🎨</div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            Artfully LMS
          </h1>
          <p className="text-xl text-gray-600">
            Learning Management System
          </p>
        </div>

        {/* Portal Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Admin Portal */}
          <Link
            to="/admin/login"
            className="group relative bg-white rounded-2xl shadow-xl border-2 border-gray-200 hover:border-purple-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative p-8">
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Building2 className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-gray-900 mb-3 group-hover:text-purple-700 transition-colors">
                Admin Portal
              </h2>
              
              {/* Description */}
              <p className="text-gray-600 mb-6">
                Full system access to manage students, batches, attendance, fees, finance, and operations.
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                  Student & batch management
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                  Fee tracking & payments
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                  OpEX/CapEX management
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                  Reports & analytics
                </li>
              </ul>

              {/* Button */}
              <div className="flex items-center justify-between text-purple-600 font-semibold group-hover:text-purple-700">
                <span>Sign In as Admin</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Staff Portal */}
          <Link
            to="/staff/login"
            className="group relative bg-white rounded-2xl shadow-xl border-2 border-gray-200 hover:border-blue-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative p-8">
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors">
                Staff Portal
              </h2>
              
              {/* Description */}
              <p className="text-gray-600 mb-6">
                Mobile-friendly interface for staff to mark attendance and manage their batches.
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                  View today's batches
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                  Mark attendance quickly
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                  Attendance history
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                  Mobile optimized
                </li>
              </ul>

              {/* Button */}
              <div className="flex items-center justify-between text-blue-600 font-semibold group-hover:text-blue-700">
                <span>Sign In as Staff</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            © 2026 Artfully LMS • Powered by ZendBX
          </p>
        </div>
      </div>
    </div>
  )
}
