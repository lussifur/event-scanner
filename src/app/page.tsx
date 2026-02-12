'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'

export default function Home() {
  const [usn, setUsn] = useState('')
  const [name, setName] = useState('')
  const [uuid, setUuid] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Insert student into database
    const { data, error } = await supabase
      .from('attendees')
      .insert([{ name, usn }])
      .select()
      .single()

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setUuid(data.id)
    }
    setLoading(false)
  }

  return (
    // Main container - light gray background
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 text-black">
      {!uuid ? (
        <form onSubmit={handleRegister} className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-200">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Event Registration</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-blue-500 text-black bg-white"
                placeholder="Ex: enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">USN / ID</label>
              <input
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-blue-500 text-black bg-white"
                placeholder="Ex: 123456"
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                required
              />
            </div>

            <button 
              disabled={loading} 
              className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 transition-colors mt-2"
            >
              {loading ? 'Generating...' : 'Get Ticket'}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center bg-white p-8 rounded-xl shadow-2xl border border-gray-200 max-w-sm w-full">
          <h2 className="text-2xl font-bold text-green-600 mb-2">Registration Complete!</h2>
          <p className="text-gray-500 mb-6">Please save this ticket.</p>
          
          <div className="bg-white p-2 inline-block border-4 border-gray-100 rounded-lg">
            <QRCodeSVG value={uuid} size={200} />
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="font-bold text-lg text-gray-800">{name}</p>
            <p className="text-sm text-gray-400 font-mono mt-1">{uuid.slice(0, 8)}...</p>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 text-blue-500 text-sm hover:underline"
          >
            Register another person
          </button>
        </div>
      )}
    </div>
  )
}