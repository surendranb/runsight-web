// Demo component to show how environment variables get exposed
import React from 'react';

const DemoExposure: React.FC = () => {
  // These environment variables will be HARDCODED into the built JavaScript
  const demoSecret = import.meta.env.VITE_DEMO_SECRET;
  const fakeApiKey = import.meta.env.VITE_FAKE_API_KEY;
  const demoDatabaseUrl = import.meta.env.VITE_DEMO_DATABASE_URL;

  // After build, the above becomes:
  // const demoSecret = "this-will-be-exposed-in-browser";
  // const fakeApiKey = "sk-1234567890abcdef";
  // const demoDatabaseUrl = "https://secret-database.example.com";

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔍 Environment Variable Exposure Demo</h2>
      
      <div style={{ background: '#ffebee', padding: '15px', margin: '10px 0' }}>
        <h3>❌ These are EXPOSED in the browser:</h3>
        <p><strong>Demo Secret:</strong> {demoSecret}</p>
        <p><strong>Fake API Key:</strong> {fakeApiKey}</p>
        <p><strong>Demo Database URL:</strong> {demoDatabaseUrl}</p>
      </div>

      <div style={{ background: '#e8f5e8', padding: '15px', margin: '10px 0' }}>
        <h3>✅ How to verify this exposure:</h3>
        <ol>
          <li>Build this app: <code>npm run build</code></li>
          <li>Look in <code>dist/assets/*.js</code> files</li>
          <li>Search for "this-will-be-exposed-in-browser"</li>
          <li>You'll find it hardcoded in the JavaScript!</li>
        </ol>
      </div>

      <div style={{ background: '#fff3e0', padding: '15px', margin: '10px 0' }}>
        <h3>⚠️ In your real app:</h3>
        <p>Your Supabase URL and anon key are similarly hardcoded into the built JavaScript files that get sent to every user's browser.</p>
        <p>Anyone can extract them by viewing the source or using developer tools.</p>
      </div>

      <div style={{ background: '#e3f2fd', padding: '15px', margin: '10px 0' }}>
        <h3>🛡️ The solution:</h3>
        <p><strong>Accept that frontend credentials are public</strong> and use Row Level Security (RLS) to protect your data at the database level.</p>
        <p>Supabase anon keys are designed to be public - the security comes from RLS policies, not hiding the keys.</p>
      </div>
    </div>
  );
};

export default DemoExposure;