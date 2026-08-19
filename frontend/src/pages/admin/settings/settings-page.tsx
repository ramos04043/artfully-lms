import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Save, Building2, Mail, Phone, MapPin, Globe, User, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/zendbx'

export default function SettingsPage() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    studioName: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    adminName: '',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data } = await db
        .from('app_settings')
        .select('*')
        .in('setting_key', ['studio_name', 'studio_email', 'studio_phone', 'studio_address', 'studio_website', 'admin_name'])

      if (data) {
        const settingsMap = new Map(data.map((s: any) => [s.setting_key, s.setting_value]))
        setSettings({
          studioName: settingsMap.get('studio_name') || 'Artfully Studio',
          email: settingsMap.get('studio_email') || '',
          phone: settingsMap.get('studio_phone') || '',
          address: settingsMap.get('studio_address') || '',
          website: settingsMap.get('studio_website') || '',
          adminName: settingsMap.get('admin_name') || '',
        })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const settingsToSave = [
        { setting_key: 'studio_name', setting_value: settings.studioName, description: 'Studio name' },
        { setting_key: 'studio_email', setting_value: settings.email, description: 'Studio email' },
        { setting_key: 'studio_phone', setting_value: settings.phone, description: 'Studio phone' },
        { setting_key: 'studio_address', setting_value: settings.address, description: 'Studio address' },
        { setting_key: 'studio_website', setting_value: settings.website, description: 'Studio website' },
        { setting_key: 'admin_name', setting_value: settings.adminName, description: 'Admin name' },
      ]

      // Check if settings exist
      const { data: existing } = await db
        .from('app_settings')
        .select('setting_key')
        .in('setting_key', settingsToSave.map(s => s.setting_key))

      const existingKeys = new Set(existing?.map((s: any) => s.setting_key) || [])

      // Update existing and insert new
      for (const setting of settingsToSave) {
        if (existingKeys.has(setting.setting_key)) {
          // Update
          await db
            .from('app_settings')
            .update({ setting_value: setting.setting_value })
            .eq('setting_key', setting.setting_key)
        } else {
          // Insert
          await db
            .from('app_settings')
            .insert(setting)
        }
      }

      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated successfully.',
      })
    } catch (err: any) {
      console.error('Error saving settings:', err)
      toast({
        title: 'Error saving settings',
        description: err.message || 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-art-indigo" />
            Settings
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            System configuration and preferences
          </p>
        </div>
        <button
          onClick={loadSettings}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh settings"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="max-w-3xl">
        <div className="bg-white rounded-lg border border-border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-art-indigo" />
            Studio Information
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-art-indigo" />
                Studio Name
              </label>
              <input
                type="text"
                value={settings.studioName}
                onChange={(e) => setSettings({ ...settings, studioName: e.target.value })}
                placeholder="Enter studio name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-art-indigo" />
                Email
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="contact@studio.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-art-indigo" />
                Phone
              </label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="+91 1234567890"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-art-indigo" />
                Address
              </label>
              <textarea
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Enter studio address"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-art-indigo" />
                Website
              </label>
              <input
                type="url"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                placeholder="https://yourstudio.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-art-indigo" />
                Admin Name
              </label>
              <input
                type="text"
                value={settings.adminName}
                onChange={(e) => setSettings({ ...settings, adminName: e.target.value })}
                placeholder="Admin user name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full md:w-auto px-8 py-3 bg-art-indigo text-white rounded-lg hover:bg-art-indigo/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold transition-all"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 flex items-start gap-2">
            <SettingsIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Settings Storage:</strong> All settings are stored in the <code className="bg-blue-100 px-1 py-0.5 rounded">app_settings</code> table. 
              Changes take effect immediately after saving. Email templates, notification preferences, and automation rules can be configured here in future updates.
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
