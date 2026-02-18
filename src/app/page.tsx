'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { Camera } from 'react-camera-pro'
import { toPng } from 'html-to-image'

export default function Home() {
  const [formData, setFormData] = useState({
    name: '', team_name: '', representative_name: '', contact_number: '', email: '', college_name: ''
  })
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  
  // REFS & STATE
  const ticketRef = useRef<HTMLDivElement>(null)
  const camera = useRef<any>(null)
  const [image, setImage] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // 1. CAPTURE PHOTO
  const takePhoto = () => {
    try {
      if (camera.current) {
        const photo = camera.current.takePhoto()
        setImage(photo)
        setShowCamera(false)
      }
    } catch (err) {
      console.error(err)
      alert("Camera failed. Please check permissions.")
      setCameraError(true)
    }
  }

  // 2. DOWNLOAD TICKET
  const downloadTicket = async () => {
    if (!ticketRef.current) return
    setDownloading(true)
    
    try {
        const dataUrl = await toPng(ticketRef.current, {
            quality: 1.0,
            pixelRatio: 2, // High Resolution (Retina quality)
            backgroundColor: '#ffffff',
            filter: (node) => {
                // Exclude the download button from the screenshot
                if (node.tagName === 'BUTTON') return false
                return true
            }
        })

        const link = document.createElement('a')
        link.download = `EventPass-${ticket.name.replace(/\s/g, '_')}.png`
        link.href = dataUrl
        link.click()

    } catch (err) {
        console.error("Download failed:", err)
        alert("Could not generate ticket image. Please try taking a screenshot manually.")
    } finally {
        setDownloading(false)
    }
  }

  // 3. REGISTER
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!image) return alert("Please take a selfie first!")
    
    setLoading(true)

    // A. Upload Photo
    const fileName = `${Date.now()}-${formData.name.replace(/\s/g, '')}.jpg`
    const blob = await (await fetch(image)).blob()
    
    const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob)

    if (uploadError) {
        alert("Photo upload failed: " + uploadError.message)
        setLoading(false)
        return
    }

    const publicUrl = supabase.storage.from('photos').getPublicUrl(fileName).data.publicUrl

    // --- NEW: Calculate IST Time Here ---
    // This ensures the database gets the correct Indian time string directly
    const istTime = new Date().toLocaleString("en-IN", { 
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });

    // B. Save to Database
    const { data, error } = await supabase
      .from('attendees')
      .insert([
        { 
            ...formData, 
            photo_url: publicUrl,
            created_at_ist: istTime // Save the IST string
        }
      ])
      .select()
      .single()

    if (error) alert('Error: ' + error.message)
    else setTicket(data)
    
    setLoading(false)
  }

  // --- RENDER TICKET SCREEN ---
  if (ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 text-black">
        {/* TICKET CARD */}
        <div ref={ticketRef} className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full border-t-4 border-blue-600 relative overflow-hidden">
          
          {/* WATERMARK (50% Opacity) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <img src="/watermark.png" alt="Watermark" className="w-64 h-64 object-contain opacity-50" />
          </div>

          {/* TICKET CONTENT */}
          <div className="relative z-10 flex flex-col items-center">
            
            {/* Banner & School Name */}
            <div className="w-full text-center border-b pb-4 mb-4 border-gray-100">
                <img src="/alliance-banner.jpg" alt="Event Banner" className="w-full h-auto rounded-md shadow-sm mb-2" />
                <p className="font-serif font-bold text-gray-800 text-sm border-b-2 border-gray-300 inline-block pb-1">Alliance School Of Advanced Computing</p>
            </div>
            
            <h2 className="text-xl font-bold text-center text-blue-900 mb-6 tracking-wide uppercase">Official Event Pass</h2>
            
            {/* Profile Photo */}
            <div className="relative z-20">
               <img 
                 src={ticket.photo_url} 
                 alt="Selfie"
                 crossOrigin="anonymous" 
                 className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg" 
               />
            </div>

            {/* QR Code */}
            <div className="bg-white p-2 rounded-lg shadow-sm mb-4 z-10 mt-6 border border-gray-100">
              <QRCodeSVG value={ticket.id} size={150} />
            </div>

            {/* User Details */}
            <div className="text-center space-y-1 mb-6">
              <p className="text-2xl font-bold text-gray-900 capitalize">{ticket.name}</p>
              <p className="text-sm font-semibold text-gray-500">{ticket.team_name}</p>
              
              <div className="mt-2">
                 <span className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                    {ticket.college_name}
                 </span>
              </div>
              
              {/* TIMESTAMP IN IST */}
              <p className="text-[10px] text-gray-400 mt-3 font-mono">
                Registered: {ticket.created_at_ist}
              </p>
            </div>

            {/* DOWNLOAD BUTTON ONLY */}
            <button 
              onClick={downloadTicket}
              disabled={downloading}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-lg mb-1 hover:bg-green-500 shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              {downloading ? 'Processing...' : '📥 Download Ticket'}
            </button>

          </div>
        </div>
      </div>
    )
  }

  // --- RENDER REGISTRATION FORM ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 relative">
      <Link href="/scan" className="absolute top-5 right-5 z-50 bg-black text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg hover:bg-gray-800 transition-all">Staff Login →</Link>
      
      <form onSubmit={handleRegister} className="bg-white rounded-xl shadow-2xl w-full max-w-md mt-10 text-black overflow-hidden border border-gray-200 relative">
        
        <img src="/alliance-banner.jpg" alt="Event Banner" className="w-full h-auto object-cover relative z-10" />

        {/* BACKGROUND WATERMARK */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 mt-32">
            <img src="/watermark.png" alt="Watermark" className="w-72 h-72 object-contain opacity-50" />
        </div>

        <div className="p-8 space-y-5 relative z-10">
            <div className="text-center">
                <p className="font-serif font-bold text-gray-800 text-xs border-b border-gray-300 inline-block pb-1 mb-2">Alliance School Of Advanced Computing</p>
                <h1 className="text-3xl font-extrabold text-blue-900 uppercase tracking-tight">Event Registration</h1>
                <p className="text-gray-500 font-medium text-sm mt-1">Please fill in your details</p>
            </div>

            {/* CAMERA SECTION */}
            <div className="flex flex-col items-center mb-4">
                {image ? (
                    <div className="relative group">
                        <img src={image} className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md bg-white" />
                        <button type="button" onClick={() => setImage(null)} className="absolute bottom-0 right-0 bg-red-500 text-white rounded-full p-2 text-xs font-bold hover:bg-red-600 transition-colors shadow-sm">Retake</button>
                    </div>
                ) : showCamera && !cameraError ? (
                    <div className="w-full h-64 bg-black relative rounded-lg overflow-hidden shadow-inner ring-4 ring-blue-50">
                        <Camera ref={camera} aspectRatio={4/3} facingMode='user' errorMessages={{ noCameraAccessible: 'No camera device accessible' }} />
                        <button type="button" onClick={takePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg z-50 hover:scale-105 transition-transform">CLICK</button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 w-full">
                        <button type="button" onClick={() => setShowCamera(true)} className="bg-blue-50 text-blue-700 border-2 border-blue-200 p-4 rounded-lg font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                            📷 Take Live Selfie
                        </button>
                    </div>
                )}
            </div>

            {/* TRANSPARENT INPUT FIELDS */}
            <div className="space-y-3">
                <input name="name" placeholder="Full Name" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black placeholder-gray-600 focus:border-blue-500 outline-none transition-all focus:shadow-md bg-transparent font-semibold" />
                <input name="team_name" placeholder="Team Name" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black placeholder-gray-600 focus:border-blue-500 outline-none transition-all focus:shadow-md bg-transparent font-semibold" />
                <input name="representative_name" placeholder="Representative Name" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black placeholder-gray-600 focus:border-blue-500 outline-none transition-all focus:shadow-md bg-transparent font-semibold" />
                <input name="contact_number" placeholder="Contact Number" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black placeholder-gray-600 focus:border-blue-500 outline-none transition-all focus:shadow-md bg-transparent font-semibold" />
                <input name="email" placeholder="Email" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black placeholder-gray-600 focus:border-blue-500 outline-none transition-all focus:shadow-md bg-transparent font-semibold" />
                <input name="college_name" placeholder="College / University Name" onChange={handleChange} required className="w-full border-2 border-blue-300 bg-transparent p-3 rounded-lg text-black placeholder-blue-600 focus:border-blue-500 outline-none transition-all focus:shadow-md font-bold" />
            </div>

            <button disabled={loading} className="w-full bg-blue-600 text-white font-bold p-4 rounded-lg hover:bg-blue-700 shadow-lg transition-transform active:scale-95">
            {loading ? 'Generating Pass...' : 'Register Now'}
            </button>
        </div>
      </form>
    </div>
  )
}