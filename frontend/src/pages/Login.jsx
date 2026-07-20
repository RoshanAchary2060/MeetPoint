import React from 'react'
import { assets } from '../assets/assets'
import { Star } from 'lucide-react'
import {SignIn} from '@clerk/clerk-react'

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* Background image */}
      <img src={assets.bgImage} alt=''
        className="absolute top-0 left-0 -z-1 w-full h-full object-cover" />

      {/* Left Side : Branding */}
      <div className="flex-1 flex flex-col items-start justify-between p-6 md:p-10 lg:pl-40">
        <img src={assets.logo} alt='' className="h-25 rounded-full object-contain" />

        <div>
          {/* Flex wrapper to place image and rating text side-by-side */}
          <div className="flex items-center gap-4">
            <img src={assets.group_users} alt='' className="h-8 md:h-10" />

            {/* Column layout for Stars + Text stacked vertically next to the image */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-0.5">
                {Array(5).fill(0).map((_, i) => (
                  <Star
                    key={i}
                    className='size-4 md:size-5 text-transparent fill-amber-500'
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-1">Used by 12k+ developers and designers</p>
            </div>
          </div>
          <h1 className='text-3xl md:text-6xl md:pb-2 font-bold bg-gradient-to-r from-indigo-950 
          to-indigo-800 bg-clip-text text-transparent'>More than just friends <br className="hidden md:block" /> truly connect</h1>
          <p className='text-xl md:text-3xl text-indigo-900 max-w-72 md:max-w-full'
          >connect with global community on meetpoint.</p>
        </div>
        <span className='md:h-10'></span>
      </div>
      {/* Right Side : Login Form */}
      <div className='flex-1 flex items-center justify-center p-6 sm:p-10'>
                <SignIn />
      </div>
    </div>
  )
}

export default Login