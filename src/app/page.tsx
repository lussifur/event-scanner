'use client'
import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import Webcam from 'react-webcam'
import { toPng } from 'html-to-image' // New import

export default function Home() {
  const [formData, setFormData] = useState({
    name: '', team_name: '', representative_name: '', contact_number: '', email: '', college_name: ''
  })
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // REFS & STATE
  const ticketRef = useRef<HTMLDivElement>(null) // Ref for the WHOLE pass
  const webcamRef = useRef<Webcam>(null) 
  const [image, setImage] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // 1. CAPTURE PHOTO
  const takePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot() 
      if (imageSrc) {
        setImage(imageSrc)
        setShowCamera(false)
      } else {
        alert("Failed to capture photo. Please try again.")
      }
    }
  }, [webcamRef])

  // 2. DOWNLOAD FULL PASS (UPDATED)
  const downloadFullPass = async () => {
    if (ticketRef.current === null) return
    
    try {
      // Captures the entire div at high quality
      const dataUrl = await toPng(ticketRef.current, { cacheBust: true, pixelRatio: 3 })
      const link = document.createElement('a')
      link.download = `Alliance-Pass-${ticket.name}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Download failed', err)
      alert("Could not generate image. Please try a screenshot.")
    }
  }

  // 3. REGISTER
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!image) return alert("Please take a selfie first!")
    
    setLoading(true)

    try {
        const fileName = `${Date.now()}-${formData.name.replace(/\s/g, '')}.jpg`
        const blob = await (await fetch(image)).blob()
        
        const { error: uploadError } = await supabase.storage
            .from('attendee_photos') 
            .upload(fileName, blob)

        if (uploadError) throw new Error("Photo upload failed: " + uploadError.message)

        const publicUrl = supabase.storage.from('attendee_photos').getPublicUrl(fileName).data.publicUrl

        const { data, error } = await supabase
          .from('attendees')
          .insert([{ ...formData, photo_url: publicUrl, status: 'checked_out' }])
          .select()
          .single()

        if (error) throw error
        setTicket(data)
    } catch (err: any) {
        alert(err.message)
    } finally {
        setLoading(false)
    }
  }

  // --- RENDER TICKET ---
  if (ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 text-black">
        {/* ticketRef added here to capture the white box and everything inside */}
        <div ref={ticketRef} className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full border-t-4 border-blue-600 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <img src="/watermark.png" alt="Watermark" className="w-64 h-64 object-contain opacity-50" />
          </div>

          <div className="relative z-10">
            <img src="/alliance-banner.jpg" alt="Event Banner" className="w-full h-auto mb-4 rounded-md shadow-sm" />
            <h2 className="text-xl font-bold text-center text-blue-900 mb-4 tracking-wide uppercase">Official Event Pass</h2>
            
            <div className="flex justify-center mb-4">
               <img src={ticket.photo_url} className="w-28 h-28 rounded-full object-cover border-4 border-blue-100 shadow-md" />
            </div>

            <div className="flex justify-center mb-4">
              <QRCodeSVG value={ticket.id} size={160} includeMargin={true} />
            </div>

            <div className="text-center space-y-1 mb-6 border-t pt-4 border-dashed border-gray-300">
              <p className="text-2xl font-bold text-gray-800">{ticket.name}</p>
              <p className="text-sm font-semibold text-gray-500">{ticket.team_name}</p>
              <p className="text-xs font-bold text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full">{ticket.college_name}</p>
            </div>
          </div>
        </div>

        {/* Buttons are OUTSIDE the ref so they aren't included in the download image */}
        <div className="w-full max-w-sm mt-4 space-y-3">
            <button onClick={downloadFullPass} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2">
              📥 Download Full Pass
            </button>
            <button onClick={() => window.location.reload()} className="w-full text-blue-600 font-bold py-2 hover:bg-gray-50 text-sm">Register Another</button>
        </div>
      </div>
    )
  }

  // --- RENDER FORM ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 relative">
      <Link href="/scan" className="absolute top-5 right-5 z-50 bg-black text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg">Staff Login →</Link>
      
      <form onSubmit={handleRegister} className="bg-white rounded-xl shadow-2xl w-full max-w-md mt-10 text-black overflow-hidden border border-gray-200 relative">
        <img src="/alliance-banner.jpg" alt="Event Banner" className="w-full h-auto object-cover relative z-10" />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 mt-32">
            <img src="/watermark.png" alt="Watermark" className="w-72 h-72 object-contain opacity-50" />
        </div>

        <div className="p-8 space-y-5 relative z-10">
            <div className="text-center">
                <h1 className="text-3xl font-extrabold text-blue-900 uppercase tracking-tight">Event Registration</h1>
                <p className="text-gray-500 font-medium text-sm mt-1">Please fill in your details</p>
            </div>

            <div className="flex flex-col items-center mb-4">
                {image ? (
                    <div className="relative group">
                        <img src={image} className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md bg-white" />
                        <button type="button" onClick={() => setImage(null)} className="absolute bottom-0 right-0 bg-red-500 text-white rounded-full p-2 text-xs font-bold shadow-sm">Retake</button>
                    </div>
                ) : showCamera ? (
                    <div className="w-full h-64 bg-black relative rounded-lg overflow-hidden shadow-inner ring-4 ring-blue-50">
                        <Webcam 
                          audio={false}
                          ref={webcamRef} 
                          screenshotFormat="image/jpeg"
                          videoConstraints={{ aspectRatio: 4/3, facingMode: 'user' }} 
                          className="w-full h-full object-cover"
                        />
                        <button type="button" onClick={takePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg z-50">CLICK</button>
                    </div>
                ) : (
                    <button type="button" onClick={() => setShowCamera(true)} className="w-full bg-blue-50 text-blue-700 border-2 border-blue-200 p-4 rounded-lg font-bold hover:bg-blue-100 flex items-center justify-center gap-2">
                        📷 Take Live Selfie
                    </button>
                )}
            </div>

            <div className="space-y-3">
                <input name="name" placeholder="Full Name" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black bg-transparent font-semibold" />
                <input name="team_name" placeholder="Team Name" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black bg-transparent font-semibold" />
                <input name="representative_name" placeholder="Representative Name" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black bg-transparent font-semibold" />
                <input name="contact_number" placeholder="Contact Number" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black bg-transparent font-semibold" />
                <input name="email" placeholder="Email" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black bg-transparent font-semibold" />
                <input name="college_name" placeholder="College / University Name" onChange={handleChange} required className="w-full border-2 border-blue-300 bg-transparent p-3 rounded-lg text-black font-bold" />
            </div>

            <button disabled={loading} className="w-full bg-blue-600 text-white font-bold p-4 rounded-lg hover:bg-blue-700 shadow-lg">
            {loading ? 'Generating Pass...' : 'Register Now'}
            </button>
        </div>
      </form>
    </div>
  )
}