'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic' // 1. Import dynamic
import { supabase } from '@/lib/supabase'

// 2. Load the Scanner ONLY on the client (browser)
// This fixes the error by preventing the server from trying to load the camera
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false }
)

export default function ScannerPage() {
  const [authorized, setAuthorized] = useState(false)
  const [pin, setPin] = useState('')
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  // 1. PIN CHECK
  const checkPin = () => {
    if (pin === process.env.NEXT_PUBLIC_ADMIN_PIN) {
      setAuthorized(true)
    } else {
      alert('Wrong PIN')
    }
  }

  // 2. SCAN HANDLER
  const handleScan = async (text: string) => {
    // Prevent duplicate scans of the same code immediately
    if (text && text !== scanResult) {
      setScanResult(text) // Lock this ID so we don't scan it twice in 1 second
      setStatusMessage('Checking database...')
      
      // Check Supabase for this ID
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('id', text)
        .single()

      if (error || !data) {
        setStatusMessage('❌ INVALID TICKET')
        // Clear result faster for invalid tickets so you can retry
        setTimeout(() => setScanResult(null), 2000)
        return
      }

      if (data.status === 'checked_in') {
        setStatusMessage(`⚠️ ALREADY USED by ${data.name}`)
      } else {
        // Update database to checked_in
        await supabase
          .from('attendees')
          .update({ status: 'checked_in' })
          .eq('id', text)
        
        setStatusMessage(`✅ SUCCESS! Welcome, ${data.name}`)
      }
      
      // Reset after 3 seconds to allow next person
      setTimeout(() => {
        setScanResult(null)
        setStatusMessage('')
      }, 3000)
    }
  }

  // 3. LOGIN SCREEN (If not authorized)
  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
        <h1 className="mb-6 text-2xl font-bold">Staff Access Only</h1>
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <input 
            type="password" 
            // ADDED "bg-white" HERE:
            className="bg-white text-black p-3 rounded text-center text-lg border-2 border-gray-500 focus:border-blue-500 outline-none" 
            placeholder="Enter Admin PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button 
            onClick={checkPin} 
            className="bg-blue-600 p-3 rounded font-bold hover:bg-blue-500 transition-colors text-white"
          >
            ENTER
          </button>
        </div>
      </div>
    )
  }

  // 4. SCANNER SCREEN (If authorized)
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4">
      <h1 className="text-xl font-bold mb-4 mt-2">Event Scanner</h1>
      
      {/* Camera Viewport */}
      <div className="w-full max-w-sm aspect-square border-4 border-white rounded-xl overflow-hidden shadow-2xl relative bg-gray-900">
        <Scanner 
            onScan={(result) => {
                if (result && result.length > 0) handleScan(result[0].rawValue)
            }}
            styles={{
              container: { width: '100%', height: '100%' }
            }}
        />
        {/* Overlay Guide Box */}
        <div className="absolute inset-0 border-2 border-white/30 m-12 pointer-events-none rounded-lg"></div>
      </div>

      {/* Status Message Box */}
      <div className={`mt-6 p-4 w-full max-w-sm text-center rounded-xl border-2 min-h-[100px] flex items-center justify-center transition-all duration-300 ${
         statusMessage.includes('SUCCESS') ? 'bg-green-900/80 border-green-500' : 
         statusMessage.includes('ALREADY') ? 'bg-yellow-900/80 border-yellow-500' :
         statusMessage.includes('INVALID') ? 'bg-red-900/80 border-red-500' :
         'bg-gray-800 border-gray-600'
      }`}>
        <h2 className={`text-xl font-bold ${
          statusMessage.includes('SUCCESS') ? 'text-green-400' : 
          statusMessage.includes('ALREADY') ? 'text-yellow-400' : 
          statusMessage.includes('INVALID') ? 'text-red-400' : 
          'text-gray-400'
        }`}>
          {statusMessage || 'Ready to scan...'}
        </h2>
      </div>
      
      <button 
        onClick={() => setAuthorized(false)}
        className="mt-8 text-gray-500 underline text-sm hover:text-white"
      >
        Logout
      </button>
    </div>
  )
}