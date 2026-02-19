'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function StaffLogin() {
  const [loginData, setLoginData] = useState({
    volunteerName: '',
    registrationNo: '', // New state for registration number
    accessPin: ''
  })
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value })
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Update this PIN to your new admin pin if needed
    if (loginData.accessPin === '2026') { 
      // Store session data including the new registration no
      localStorage.setItem('volunteer', loginData.volunteerName)
      localStorage.setItem('regNo', loginData.registrationNo)
      router.push('/scanner-main') // Redirect to your actual scanner logic
    } else {
      alert("Invalid Access PIN")
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white font-sans">
      <Link href="/" className="absolute top-8 left-8 text-gray-400 hover:text-white flex items-center gap-2 transition-all">
        ← Back
      </Link>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black text-[#3b82f6] tracking-widest uppercase">Staff Login</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* VOLUNTEER NAME */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Volunteer Name</label>
            <input 
              required
              name="volunteerName"
              placeholder="Ex: John Doe"
              onChange={handleChange}
              className="w-full bg-white text-black p-4 rounded-xl font-bold placeholder:text-gray-400 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* NEW: REGISTRATION NO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Registration No</label>
            <input 
              required
              name="registrationNo"
              placeholder="Ex: 2021CSE001"
              onChange={handleChange}
              className="w-full bg-white text-black p-4 rounded-xl font-bold placeholder:text-gray-400 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* ACCESS PIN */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Access Pin</label>
            <input 
              required
              type="password"
              name="accessPin"
              placeholder="••••"
              onChange={handleChange}
              className="w-full bg-white text-black p-4 rounded-xl font-bold tracking-[0.5em] placeholder:tracking-normal placeholder:text-gray-400 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <button type="submit" className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-black py-4 rounded-xl shadow-2xl shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-widest">
            Login
          </button>
        </form>
      </div>
    </div>
  )
}