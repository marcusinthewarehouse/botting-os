import React, { useState } from 'react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    discordChannel: '#botting-alerts',
    proxyApiKey: '••••••••••••••••••••••••',
    nikeMargin: 30,
    supremeMargin: 40,
    ftlMargin: 25,
    pokemonMargin: 35,
    storeAliases: 'Nike, Supreme, Foot Locker, Pokemon, eBay',
    proxyRotation: true,
    autoRetry: true,
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
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Configure bot behavior and integrations</p>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mb-6 bg-emerald-900 border border-emerald-700 text-emerald-300 px-6 py-4 rounded-lg animate-pulse">
            ✅ Settings saved successfully
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Discord Integration */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 hover:border-slate-600 transition">
              <h2 className="text-2xl font-semibold text-white mb-6">Discord Integration</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Webhook Channel</label>
                <p className="text-slate-400 text-sm mb-3">Receive alerts in this channel</p>
                <input
                  type="text"
                  value={settings.discordChannel}
                  onChange={(e) => handleChange('discordChannel', e.target.value)}
                  placeholder="#botting-alerts"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Proxy Settings */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 hover:border-slate-600 transition">
              <h2 className="text-2xl font-semibold text-white mb-6">Proxy Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Proxy API Key</label>
                  <p className="text-slate-400 text-sm mb-3">Your proxy provider authentication</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={settings.proxyApiKey}
                      readOnly
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white"
                    />
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition">
                      Regenerate
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-700 pt-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-white">Proxy Rotation</label>
                    <p className="text-slate-400 text-xs mt-1">Auto-rotate on each request</p>
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
              </div>
            </div>

            {/* Store Configuration */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 hover:border-slate-600 transition">
              <h2 className="text-2xl font-semibold text-white mb-6">Store Configuration</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Store Aliases</label>
                <p className="text-slate-400 text-sm mb-3">Comma-separated list of stores to monitor</p>
                <input
                  type="text"
                  value={settings.storeAliases}
                  onChange={(e) => handleChange('storeAliases', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Profit Margins */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 hover:border-slate-600 transition">
              <h2 className="text-2xl font-semibold text-white mb-6">Profit Margins by Store</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nike (%)</label>
                  <input
                    type="number"
                    value={settings.nikeMargin}
                    onChange={(e) => handleChange('nikeMargin', parseInt(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Supreme (%)</label>
                  <input
                    type="number"
                    value={settings.supremeMargin}
                    onChange={(e) => handleChange('supremeMargin', parseInt(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Foot Locker (%)</label>
                  <input
                    type="number"
                    value={settings.ftlMargin}
                    onChange={(e) => handleChange('ftlMargin', parseInt(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Pokemon (%)</label>
                  <input
                    type="number"
                    value={settings.pokemonMargin}
                    onChange={(e) => handleChange('pokemonMargin', parseInt(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
              <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span className="text-sm text-slate-300">Discord configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span className="text-sm text-slate-300">Proxy API active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span className="text-sm text-slate-300">5 stores configured</span>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
              <h3 className="text-lg font-semibold text-white mb-4">Advanced</h3>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Auto Retry</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoRetry}
                    onChange={(e) => handleChange('autoRetry', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-300 mb-4">⚠️ Danger Zone</h3>
              
              <button className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-700/50 px-4 py-2 rounded-lg text-sm font-medium transition">
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-12 flex justify-end gap-4">
          <button className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-8 py-3 rounded-lg font-medium transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-medium transition"
          >
            💾 Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
