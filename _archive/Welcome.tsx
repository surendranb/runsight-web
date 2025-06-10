import React from 'react';
import { Activity, BarChart3, Cloud, Database, Shield, Zap } from 'lucide-react';
import { AuthButton } from './AuthButton';

export const Welcome: React.FC = () => {
  const features = [
    {
      icon: Activity,
      title: 'Strava Integration',
      description: 'Seamlessly connect with your Strava account to import all your running data automatically.',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      icon: Cloud,
      title: 'Weather Insights',
      description: 'Get historical weather data for each run to understand how conditions affect your performance.',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: BarChart3,
      title: 'Beautiful Analytics',
      description: 'Visualize your progress with interactive charts and comprehensive running statistics.',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is encrypted and secure. Only you can access your personal running analytics.',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-xl">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Running Analytics</h1>
                <p className="text-sm text-gray-600">Powered by Strava & OpenWeatherMap</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
              <Database className="w-4 h-4" />
              <span>Supabase</span>
              <span>•</span>
              <Zap className="w-4 h-4" />
              <span>Open Source</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-16">
          <div className="mb-8">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Unlock Your
              <span className="bg-gradient-to-r from-blue-600 to-orange-600 bg-clip-text text-transparent"> Running </span>
              Potential
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Connect your Strava account to get comprehensive analytics about your runs, 
              including weather data, performance trends, and personalized insights to help you improve.
            </p>
          </div>
          
          <div className="mb-16">
            <AuthButton />
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className={`inline-flex items-center justify-center w-16 h-16 ${feature.bg} rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Preview Section */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-16">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">What You'll See</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl">
                  <div className="text-2xl font-bold">127</div>
                  <div className="text-sm opacity-90">Total Runs</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl">
                  <div className="text-2xl font-bold">1,247 km</div>
                  <div className="text-sm opacity-90">Total Distance</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl">
                  <div className="text-2xl font-bold">5:23/km</div>
                  <div className="text-sm opacity-90">Average Pace</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl">
                  <div className="text-2xl font-bold">89h</div>
                  <div className="text-sm opacity-90">Total Time</div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Interactive charts and detailed analytics</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Get Started?</h3>
            <p className="text-gray-600 mb-8">
              Connect your Strava account and start analyzing your running performance today.
            </p>
            <AuthButton />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">Open source running analytics • Built with React, Supabase, and love for running</p>
            <p className="text-sm">Your data stays private and secure</p>
          </div>
        </div>
      </footer>
    </div>
  );
};