import React, { useState } from 'react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    proxyRotation: true,
    autoRetry: true,
    notificationsEnabled: true,
    darkMode: true,
    maxRetries: 3,
    timeoutSeconds: 30,
    apiKey: '••••••••••••••••',
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (key: string, value: any) => {
    setSettings({...settings, [key]: value});
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-8">Settings</h1>

        {/* Success Message */}
        {saved && (
          <div className="mb-6 bg-emerald-900 border border-emerald-700 text-emerald-300 px-6 py-4 rounded-lg">
            ✅ Settings saved successfully
          </div>
        )}

        {/* Bot Configuration */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6">Bot Configuration</h2>
          
          <div className="space-y-6">
            {/* Proxy Rotation Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-lg font-medium text-slate-100">Proxy Rotation</label>
                <p className="text-slate-400 text-sm mt-1">Automatically rotate proxies between requests</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.proxyRotation}
                  onChange={(e) => handleChange('proxyRotation', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Auto Retry Toggle */}
            <div className="flex items-center justify-between border-t border-slate-700 pt-6">
              <div>
                <label className="text-lg font-medium text-slate-100">Auto Retry Failed Orders</label>
                <p className="text-slate-400 text-sm mt-1">Automatically retry failed orders</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRetry}
                  onChange={(e) => handleChange('autoRetry', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Max Retries */}
            <div className="border-t border-slate-700 pt-6">
              <label className="text-lg font-medium text-slate-100">Max Retries</label>
              <p className="text-slate-400 text-sm mt-1">Number of times to retry failed orders</p>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxRetries}
                onChange={(e) => handleChange('maxRetries', parseInt(e.target.value))}
                className="mt-3 w-32 bg-slate-700 border border-slate-600 rounded px-4 py-2 text-slate-100"
              />
            </div>

            {/* Timeout */}
            <div className="border-t border-slate-700 pt-6">
              <label className="text-lg font-medium text-slate-100">Request Timeout (Seconds)</label>
              <p className="text-slate-400 text-sm mt-1">How long to wait before timing out a request</p>
              <input
                type="number"
                min="10"
                max="120"
                value={settings.timeoutSeconds}
                onChange={(e) => handleChange('timeoutSeconds', parseInt(e.target.value))}
                className="mt-3 w-32 bg-slate-700 border border-slate-600 rounded px-4 py-2 text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6">Notifications</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-lg font-medium text-slate-100">Enable Notifications</label>
              <p className="text-slate-400 text-sm mt-1">Receive alerts for critical events</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* API Settings */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6">API Settings</h2>
          
          <div>
            <label className="text-lg font-medium text-slate-100">API Key</label>
            <p className="text-slate-400 text-sm mt-1">Your unique API authentication key</p>
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                value={settings.apiKey}
                readOnly
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-4 py-2 text-slate-100"
              />
              <button className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded font-medium transition">
                Regenerate
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900 border border-red-700 rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-red-300 mb-6">⚠️ Danger Zone</h2>
          
          <div className="space-y-4">
            <button className="w-full bg-red-700 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition">
              Reset All Settings to Default
            </button>
            <button className="w-full bg-red-700 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition">
              Clear All Data
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end gap-4">
          <button className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-8 py-3 rounded-lg font-medium transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-medium transition"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
