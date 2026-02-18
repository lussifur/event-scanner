'use client'
import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import Webcam from 'react-webcam'
import { toPng } from 'html-to-image'

export default function Home() {
  const [formData, setFormData] = useState({
    name: '', team_name: '', representative_name: '', contact_number: '', email: '', college_name: '', event_name: ''
  })
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const ticketRef = useRef<HTMLDivElement>(null)
  const webcamRef = useRef<Webcam>(null) 
  const [image, setImage] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

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

  const downloadFullPass = async () => {
    if (ticketRef.current === null) return
    try {
      const dataUrl = await toPng(ticketRef.current, { cacheBust: true, pixelRatio: 3 })
      const link = document.createElement('a')
      link.download = `Alliance-Pass-${ticket.name}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      alert("Could not generate image. Please try a screenshot.")
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!image) return alert("Please take a selfie first!")
    setLoading(true)

    try {
        const fileName = `${Date.now()}-${formData.name.replace(/\s/g, '')}.jpg`
        const blob = await (await fetch(image)).blob()
        const { error: uploadError } = await supabase.storage.from('attendee_photos').upload(fileName, blob)
        if (uploadError) throw uploadError

        const publicUrl = supabase.storage.from('attendee_photos').getPublicUrl(fileName).data.publicUrl
        const { data, error } = await supabase.from('attendees').insert([{ ...formData, photo_url: publicUrl, status: 'checked_out' }]).select().single()
        if (error) throw error
        setTicket(data)
    } catch (err: any) {
        alert(err.message)
    } finally {
        setLoading(false)
    }
  }

  if (ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 text-black">
        <div ref={ticketRef} className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full border-t-4 border-blue-600 relative overflow-hidden text-center">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <img src="/watermark.png" alt="Watermark" className="w-64 h-64 object-contain opacity-50" />
          </div>

          <div className="relative z-10">
            <img src="/alliance-banner.jpg" alt="Event Banner" className="w-full h-auto mb-4 rounded-md shadow-sm" />
            
            <h2 className="text-xl font-black text-blue-900 tracking-tight uppercase">EVENT PASS</h2>
            {/* SHASTRA Style: Bold, Normal (not italic), Red */}
            <p className="text-3xl font-bold text-red-600 mb-4 tracking-widest uppercase">SHASTRA</p>
            
            <div className="flex justify-center mb-4">
               <img src={ticket.photo_url} className="w-28 h-28 rounded-full object-cover border-4 border-blue-100 shadow-md" />
            </div>

            <div className="flex justify-center mb-4">
              <QRCodeSVG value={ticket.id} size={160} includeMargin={true} />
            </div>

            <div className="text-center space-y-1 mb-6 border-t pt-4 border-dashed border-gray-300">
              <p className="text-2xl font-bold text-gray-800 uppercase">{ticket.name}</p>
              <p className="text-sm font-semibold text-gray-500 uppercase">{ticket.team_name}</p>
              <p className="text-xs font-bold text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full uppercase">{ticket.college_name}</p>
              <p className="block text-sm font-bold text-gray-400 mt-1 uppercase">{ticket.event_name}</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm mt-4 space-y-3">
            <button onClick={downloadFullPass} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95">
              📥 Download Full Pass
            </button>
            <button onClick={() => window.location.reload()} className="w-full text-blue-600 font-bold py-2 hover:bg-gray-50 text-sm">Register Another</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 relative text-black">
      <Link href="/scan" className="absolute top-5 right-5 z-50 bg-black text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg">Staff Login →</Link>
      
      <form onSubmit={handleRegister} className="bg-white rounded-xl shadow-2xl w-full max-w-md mt-10 overflow-hidden border border-gray-200 relative">
        <img src="/alliance-banner.jpg" alt="Event Banner" className="w-full h-auto object-cover relative z-10" />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 mt-32">
            <img src="/watermark.png" alt="Watermark" className="w-72 h-72 object-contain opacity-50" />
        </div>

        <div className="p-8 space-y-5 relative z-10">
            <div className="text-center">
                <h1 className="text-2xl font-black text-blue-900 uppercase tracking-tight">EVENT PASS</h1>
                {/* SHASTRA Style: Bold, Normal (not italic), Red */}
                <p className="text-4xl font-bold text-red-600 tracking-widest uppercase">SHASTRA</p>
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
                <input name="name" placeholder="Full Name" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black bg-transparent font-bold placeholder:text-gray-600 placeholder:font-bold outline-none focus:border-blue-500 uppercase" />
                <input name="team_name" placeholder="Team Name" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black bg-transparent font-bold placeholder:text-gray-600 placeholder:font-bold outline-none focus:border-blue-500 uppercase" />
                <input name="representative_name" placeholder="Team Lead Name" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black bg-transparent font-bold placeholder:text-gray-600 placeholder:font-bold outline-none focus:border-blue-500 uppercase" />
                <input name="contact_number" placeholder="Contact Number" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black bg-transparent font-bold placeholder:text-gray-600 placeholder:font-bold outline-none focus:border-blue-500" />
                <input name="email" placeholder="Email" onChange={handleChange} required className="w-full border-2 border-gray-300 p-3 rounded-lg text-black bg-transparent font-bold placeholder:text-gray-600 placeholder:font-bold outline-none focus:border-blue-500" />
                <input name="college_name" placeholder="College / University Name" onChange={handleChange} required className="w-full border-2 border-blue-300 bg-transparent p-3 rounded-lg text-black font-extrabold placeholder:text-blue-800 placeholder:font-bold outline-none focus:border-blue-500 uppercase" />
                <input name="event_name" placeholder="Event Name" onChange={handleChange} required className="w-full border-2 border-blue-300 bg-[#f0f7ff] p-3 rounded-lg text-black font-extrabold placeholder:text-blue-800 placeholder:font-bold outline-none focus:border-blue-500 uppercase" />
            </div>

            <button disabled={loading} className="w-full bg-blue-600 text-white font-bold p-4 rounded-lg hover:bg-blue-700 shadow-lg transition-transform active:scale-95 uppercase">
            {loading ? 'Generating Pass...' : 'Register Now'}
            </button>
        </div>
      </form>
    </div>
  )
}