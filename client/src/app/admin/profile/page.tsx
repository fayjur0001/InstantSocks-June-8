"use client"

import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Camera } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { profileService } from '@/lib/profile.service'

interface UserProfile {
  username: string
  firstName: string
  nickName: string
  lastName: string
  userEmail: string
  website: string
  telegram: string
  jabber: string
  aboutBio: string
  avatarUrl?: string
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!(error instanceof Error)) return fallback
  try {
    const parsed = JSON.parse(error.message)
    return parsed?.message || fallback
  } catch {
    return error.message || fallback
  }
}

const ProfileField = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  ...props
}: {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-c-zinc-300">
      {label}
    </Label>
    <Input
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="bg-c-zinc-800 border-c-zinc-700 text-white placeholder:text-c-zinc-500"
      {...props}
    />
  </div>
)

const InputWithVisibility = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  ...props
}: {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
} & React.InputHTMLAttributes<HTMLInputElement>) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-2 relative">
      <Label htmlFor={id} className="text-c-zinc-300">
        {label}
      </Label>
      <Input
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-c-zinc-800 border-c-zinc-700 text-white placeholder:text-c-zinc-500 pr-10"
        {...props}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-0 top-6 bottom-0 text-c-zinc-400 hover:text-white hover:bg-transparent px-3"
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  )
}

const UserManagement: NextPage = () => {
  const [user, setUser] = useState<UserProfile>({
    username: '',
    firstName: '',
    nickName: '',
    lastName: '',
    userEmail: '',
    website: '',
    telegram: '',
    jabber: '',
    aboutBio: '',
  })

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [oldSecretPin, setOldSecretPin] = useState('')
  const [newSecretPin, setNewSecretPin] = useState('')

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    let active = true

    const loadProfile = async () => {
      try {
        const data = await profileService.getProfile()
        if (!active) return

        setUser({
          username: data.user.username || '',
          firstName: data.user.firstName || '',
          nickName: data.user.nickName || '',
          lastName: data.user.lastName || '',
          userEmail: data.user.email || '',
          website: data.user.website || '',
          telegram: data.user.telegram || '',
          jabber: data.user.jabber || '',
          aboutBio: data.user.bio || '',
          avatarUrl: data.user.avatar || '',
        })
        if (data.user.avatar) setAvatarPreview(data.user.avatar)
      } catch (error) {
        if (active) {
          toast.error(getApiErrorMessage(error, 'Failed to load profile.'))
        }
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [])

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setUser((prev) => ({ ...prev, [field]: value }))
  }

  // ── Avatar upload ────────────────────────────────────────────────────────────
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side preview — immediate feedback
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Upload via profileService (base64 JSON)
    setUploadingAvatar(true)
    try {
      const result = await profileService.uploadAvatar(file)
      toast.success(result.message || 'Profile photo updated successfully.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to upload photo.'))
      setAvatarPreview(user.avatarUrl)
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleProfileUpdate = async () => {
    try {
      const result = await profileService.updateProfile({
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        nickName: user.nickName,
        website: user.website,
        telegram: user.telegram,
        jabber: user.jabber,
        bio: user.aboutBio,
      })
      toast.success(result.message || 'Profile updated successfully.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Profile update failed.'))
    }
  }

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) {
      toast.error('Please fill in both password fields.')
      return
    }
    try {
      const result = await profileService.changePassword(oldPassword, newPassword)
      setOldPassword('')
      setNewPassword('')
      toast.success(result.message || 'Password changed successfully.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Password change failed.'))
    }
  }

  const handlePinChange = async () => {
    if (!oldSecretPin || !newSecretPin) {
      toast.error('Please fill in both PIN fields.')
      return
    }
    try {
      const result = await profileService.changePin(oldSecretPin, newSecretPin)
      setOldSecretPin('')
      setNewSecretPin('')
      toast.success(result.message || 'PIN changed successfully.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'PIN change failed.'))
    }
  }

  return (
    <>
      <Head>
        <title>User Management | Repsatsms</title>
      </Head>

      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      <div className=" rounded-[12px] bg-zinc-950 text-white p-2 lg:p-4">
        <div>
          {/* Header */}
          <header className="flex items-center justify-between pb-4 mb-4 border-b border-c-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-c-zinc-900 border border-c-zinc-800">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-c-green-tw-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold">User Management</h1>
            </div>
          </header>

          {/* Main Content: Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6">
            {/* Left Content: Profile, Contact, About (2/3 width on md+) */}
            <div className="md:col-span-2 space-y-4 xl:space-y-6">
              {/* Profile Information */}
              <Card className="bg-c-zinc-900 border-c-zinc-800 py-3 xl:py-4 gap-2">
                <CardHeader className='px-3 xl:px-4'>
                  <CardTitle className="text-lg xl:text-xl text-white">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:gap-4 px-3 xl:px-4">
                  <ProfileField id="username" label="Username" value={user.username}
                    onChange={(e) => handleInputChange('username', e.target.value)} placeholder="Enter username" />
                  <ProfileField id="firstName" label="First Name" value={user.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)} placeholder="Enter first name" />
                  <ProfileField id="nickName" label="Nick Name" value={user.nickName}
                    onChange={(e) => handleInputChange('nickName', e.target.value)} placeholder="Enter nick name" />
                  <ProfileField id="lastName" label="Last Name" value={user.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)} placeholder="Enter last name" />
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="bg-c-zinc-900 border-c-zinc-800 py-3 xl:py-4 gap-2">
                <CardHeader className='px-3 xl:px-4'>
                  <CardTitle className="text-lg xl:text-xl text-white">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:gap-4 px-3 xl:px-4">
                  <ProfileField id="userEmail" label="User Email" type="email" value={user.userEmail}
                    onChange={(e) => handleInputChange('userEmail', e.target.value)} placeholder="Enter email" />
                  <ProfileField id="website" label="Website" value={user.website}
                    onChange={(e) => handleInputChange('website', e.target.value)} placeholder="Enter website URL" />
                  <ProfileField id="telegram" label="Telegram" value={user.telegram}
                    onChange={(e) => handleInputChange('telegram', e.target.value)} placeholder="Enter Telegram username" />
                  <ProfileField id="jabber" label="Jabber" value={user.jabber}
                    onChange={(e) => handleInputChange('jabber', e.target.value)} placeholder="Enter Jabber ID" />
                </CardContent>
              </Card>

              {/* About / Bio */}
              <Card className="bg-c-zinc-900 border-c-zinc-800 py-3 xl:py-4 gap-2">
                <CardHeader className='px-3 xl:px-4'>
                  <CardTitle className="text-lg xl:text-xl text-white">About / Bio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-3 xl:px-4">
                  <Textarea
                    id="aboutBio"
                    value={user.aboutBio}
                    onChange={(e) => handleInputChange('aboutBio', e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="bg-c-zinc-800 border-c-zinc-700 text-white placeholder:text-c-zinc-500 min-h-[120px]"
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleProfileUpdate} className="bg-c-green-tw-600 hover:bg-c-green-tw-700 text-white px-10 h-11 font-semibold">
                  Update
                </Button>
              </div>
            </div>

            {/* Right Panel: Account Management (1/3 width on md+) */}
            <div className="space-y-4 xl:space-y-6">
              <Card className="bg-c-zinc-900 border-c-zinc-800 py-3 xl:py-4">
                <CardHeader>
                  <CardTitle className="text-lg xl:text-xl text-white">Account Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 xl:space-y-4 px-3 xl:px-4">

                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-4 text-center">
                    <Avatar className="w-28 h-28 border-4 border-c-zinc-700 bg-c-zinc-800 rounded-lg">
                      <AvatarImage src={avatarPreview} alt={user.firstName} />
                      <AvatarFallback className="bg-c-zinc-800 text-c-zinc-500 rounded-lg">
                        <svg
                          className="w-20 h-20"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2 border-c-zinc-700 bg-c-zinc-800 hover:bg-c-zinc-700 text-white hover:text-white w-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Camera className="h-4 w-4" />
                      {uploadingAvatar ? 'Uploading…' : 'Upload Photo'}
                    </Button>
                  </div>

                  <Separator className="bg-c-zinc-800" />

                  {/* Password Change */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-c-zinc-400 mb-2">Change Password</h4>
                    <InputWithVisibility
                      id="oldPassword"
                      label="Old Password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter old password"
                    />
                    <InputWithVisibility
                      id="newPassword"
                      label="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      onClick={handlePasswordChange}
                      className="w-full bg-c-green-tw-600 hover:bg-c-green-tw-700 text-white"
                    >
                      Change Password
                    </Button>
                  </div>

                  <Separator className="bg-c-zinc-800" />

                  {/* Pin Change */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-c-zinc-400 mb-2">Change Secret Pin</h4>
                    <InputWithVisibility
                      id="oldSecretPin"
                      label="Old Secret Pin"
                      value={oldSecretPin}
                      onChange={(e) => setOldSecretPin(e.target.value)}
                      placeholder="Enter old PIN"
                      maxLength={6}
                    />
                    <InputWithVisibility
                      id="newSecretPin"
                      label="New Secret Pin"
                      value={newSecretPin}
                      onChange={(e) => setNewSecretPin(e.target.value)}
                      placeholder="Enter new PIN"
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      onClick={handlePinChange}
                      className="w-full bg-c-green-tw-600 hover:bg-c-green-tw-700 text-white"
                    >
                      Change Pin
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default UserManagement