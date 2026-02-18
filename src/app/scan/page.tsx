'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Load Scanner only on client side to prevent server errors
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false }
)

export default function ScannerPage() {
  // --- STATE MANAGEMENT ---
  const [adminName, setAdminName] = useState('')
  const [pin, setPin] = useState('') 
  const [authorized, setAuthorized] = useState(false)
   
  const [scannedId, setScannedId] = useState<string | null>(null)
  const [venue, setVenue] = useState('')
  const [showVenueModal, setShowVenueModal] = useState(false)
  const [detectedUser, setDetectedUser] = useState<any>(null)
  const [statusMessage, setStatusMessage] = useState('')

  // 1. LOGIN HANDLER
  const handleLogin = () => {
    if (pin === '1234') { 
        if (!adminName.trim()) return alert("Please enter your name first.")
        setAuthorized(true)
    } else {
        alert('Wrong PIN')
    }
  }

  // 2. SCAN DETECTED
  const onScan = async (result: any) => {
    if (!result || !result[0]) return
    const id = result[0].rawValue

    // Prevent duplicate scans while modal is open
    if (showVenueModal || scannedId === id) return 

    console.log("📸 Scanned ID:", id)
    setScannedId(id)
    setStatusMessage('🔍 Searching Database...')
    
    // Fetch User AND their current Status
    const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('id', id)
        .single()
    
    if (error || !data) {
        alert("❌ Ticket not found!")
        setScannedId(null)
        setStatusMessage('')
        return
    }

    setDetectedUser(data)
    setShowVenueModal(true)
    setStatusMessage('✅ Verify Identity')
  }

  // 3. PROCESS SCAN (TOGGLE IN/OUT)
  const processScan = async () => {
    if (!scannedId) return

    // --- TOGGLE LOGIC ---
    // If status is 'checked_in' -> Switch to 'checked_out'
    // If status is 'checked_out' (or null) -> Switch to 'checked_in'
    const isInside = detectedUser.status === 'checked_in'
    const newStatus = isInside ? 'checked_out' : 'checked_in'
    const typeLabel = isInside ? 'OUT' : 'IN'

    setShowVenueModal(false)
    setStatusMessage('⏳ Saving...')

    // Generate IST Time as a String (Avoids timestamp errors)
    const istNow = new Date().toLocaleString("en-IN", { 
        timeZone: "Asia/Kolkata",
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
    })
    
    // A. Update Status in Main Table
    const { error: updateError } = await supabase
        .from('attendees')
        .update({ 
            status: newStatus, 
            last_scanned_by: adminName, 
            last_scanned_at: istNow 
        })
        .eq('id', scannedId)

    if (updateError) {
        console.error("Update Failed:", updateError)
        alert("Database Error: Could not update status.")
        return
    }

    // B. Save to History Log
    await supabase.from('scan_history').insert([{
        attendee_id: detectedUser.id, 
        attendee_name: detectedUser.name, 
        team_name: detectedUser.team_name,
        scan_type: typeLabel, 
        venue: venue || 'Main Gate',
        scanned_by: adminName,
        scanned_at: istNow
    }])

    // C. Success Feedback
    setStatusMessage(isInside ? `👋 CHECK-OUT SUCCESS: ${detectedUser.name}` : `✅ CHECK-IN SUCCESS: ${detectedUser.name}`)
    
    // D. Reset for next scan
    setVenue('') 
    setDetectedUser(null)
    setTimeout(() => { 
        setScannedId(null)
        setStatusMessage('')
    }, 3000)
  }

  // --- UI: LOGIN SCREEN (Fixed Visibility) ---
  if (!authorized) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 relative">
          <Link href="/" className="absolute top-6 left-6 text-gray-400 hover:text-white font-bold text-lg">← Back</Link>
          <h1 className="text-3xl font-bold mb-8 uppercase tracking-widest text-blue-400">Staff Login</h1>
          
          <div className="w-full max-w-xs space-y-6">
            <div>
              <label className="block text-gray-300 mb-2 text-sm font-bold uppercase">Volunteer Name</label>
              <input 
                className="w-full p-4 rounded-lg text-black font-bold bg-white outline-none focus:ring-4 ring-blue-500" 
                placeholder="Ex: John Doe" 
                value={adminName} 
                onChange={e => setAdminName(e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2 text-sm font-bold uppercase">Access PIN</label>
              <input 
                type="password" 
                className="w-full p-4 rounded-lg text-black font-bold bg-white outline-none tracking-widest focus:ring-4 ring-blue-500" 
                placeholder="****" 
                value={pin} 
                onChange={e => setPin(e.target.value)} 
              />
            </div>
            
            <button 
              onClick={handleLogin} 
              className="w-full bg-blue-600 p-4 rounded-lg font-bold text-white text-lg hover:bg-blue-500 transition-transform active:scale-95 shadow-lg mt-2"
            >
              LOGIN
            </button>
          </div>
      </div>
  )

  // --- UI: SCANNER SCREEN ---
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 relative">
      
      {/* Header */}
      <div className="w-full flex justify-between mb-4 items-center max-w-sm">
        <span className="text-gray-400 text-sm">Operator: <span className="text-white font-bold">{adminName}</span></span>
        <button onClick={() => setAuthorized(false)} className="text-red-400 text-xs border border-red-900 px-3 py-1 rounded hover:bg-red-900">Logout</button>
      </div>

      {/* Camera Window */}
      <div className="w-full max-w-sm aspect-square border-4 border-gray-700 rounded-xl overflow-hidden relative bg-black shadow-2xl">
        {!showVenueModal && (
            <Scanner onScan={onScan} styles={{ container: { width: '100%', height: '100%' } }} />
        )}
      </div>

      {/* VERIFICATION MODAL */}
      {showVenueModal && detectedUser && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
            <div className="bg-white text-black p-6 rounded-xl w-full max-w-xs text-center shadow-2xl relative">
                
                <div className="mb-6">
                    <p className="text-xs text-gray-500 mb-3 font-bold uppercase tracking-widest">Verify Identity</p>
                    <div className="relative w-32 h-32 mx-auto mb-3">
                        <img src={detectedUser.photo_url} className="w-full h-full rounded-full object-cover border-4 border-blue-500 shadow-md" alt="User" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900">{detectedUser.name}</h2>
                    <p className="text-gray-500 text-sm font-semibold">{detectedUser.team_name}</p>
                    
                    {/* CURRENT STATUS BADGE */}
                    <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold inline-block border ${detectedUser.status === 'checked_in' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                        STATUS: {detectedUser.status === 'checked_in' ? 'INSIDE' : 'OUTSIDE'}
                    </div>
                </div>

                <div className="text-left mb-4">
                    <input placeholder="Enter Venue (e.g. Hall A)" autoFocus value={venue} onChange={e => setVenue(e.target.value)} className="w-full border-2 border-gray-300 p-3 rounded-lg text-lg outline-none focus:border-blue-500 font-bold text-center" />
                </div>
                
                {/* DYNAMIC BUTTON - Red for Exit, Green for Entry */}
                <button 
                  onClick={processScan} 
                  className={`w-full text-white font-bold py-4 rounded-lg text-lg shadow-lg transition-all mb-3 ${
                      detectedUser.status === 'checked_in' 
                      ? 'bg-red-600 hover:bg-red-500' // Show RED EXIT Button if IN
                      : 'bg-green-600 hover:bg-green-500' // Show GREEN ENTRY Button if OUT
                  }`}
                >
                  {detectedUser.status === 'checked_in' ? '🛑 VERIFY & CHECK OUT' : '✅ VERIFY & CHECK IN'}
                </button>
                
                <button onClick={() => { setShowVenueModal(false); setScannedId(null); setStatusMessage(''); }} className="text-gray-400 text-sm font-bold hover:text-black py-2">Cancel</button>
            </div>
        </div>
      )}

      {/* STATUS BANNER */}
      <div className={`mt-6 w-full max-w-sm p-4 rounded-xl text-center font-bold text-lg border-2 ${
         statusMessage.includes('SUCCESS') ? 'bg-green-900/90 border-green-500 text-green-100' : 
         statusMessage.includes('Error') || statusMessage.includes('Invalid') ? 'bg-red-900/90 border-red-500 text-red-100' :
         'bg-gray-800 border-gray-700 text-gray-400'
      }`}>
         {statusMessage || 'Ready to Scan...'}
      </div>
    </div>
  )
}