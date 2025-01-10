#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function initApp() {
  console.log('Welcome to Vite React App Generator with Supabase Auth!');

  // Ask for project name
  const projectName = await askQuestion('Enter your project name: ');

  if (!projectName) {
    console.error('Project name is required.');
    rl.close();
    return;
  }

  // Ask if Supabase authentication should be added
  const useSupabase = await askQuestion('Do you want Supabase authentication? (yes/no): ');

  let provider = '';
  if (useSupabase.toLowerCase() === 'yes') {
    provider = await askQuestion('Which provider do you want to use? (google/slack): ');
    if (!['google', 'slack'].includes(provider.toLowerCase())) {
      console.error('Invalid provider selected.');
      rl.close();
      return;
    }
  }

  const projectPath = path.join(process.cwd(), projectName);

  console.log('\nCreating Vite React app...');
  execSync(`npm create vite@latest ${projectName} -- --template react`, { stdio: 'inherit' });

  console.log('Initializing project dependencies...');
  process.chdir(projectPath);
  execSync('npm install react react-dom @supabase/supabase-js', { stdio: 'inherit' });

  if (useSupabase.toLowerCase() === 'yes') {
    console.log('Setting up Supabase authentication...');

    // Create Supabase config file inside src
    const supabaseConfigContent = `
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
    `;
    fs.writeFileSync(path.join(projectPath, 'src', 'supabaseConfig.js'), supabaseConfigContent);

    // Create an Auth.jsx file for handling authentication
    const authContent = `
    import React, { useState, useEffect } from 'react';
    import { supabase } from './supabaseConfig';
    
    function Auth() {
      const [session, setSession] = useState(null);
    
      useEffect(() => {
        // Get the current session
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
        });
    
        // Listen for auth state changes
        supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
        });
      }, []);
    
      const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Error signing out:', error.message);
        }
      };
    
      const signInWithProvider = async () => {
        const provider = '${provider.toLowerCase() === 'slack' ? 'slack_oidc' : provider.toLowerCase()}';
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
        });
        if (error) {
          console.error('Error signing in:', error.message);
        }
      };
    
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
          {!session ? (
            <button onClick={signInWithProvider} style={{ padding: '10px 20px', margin: '10px', fontSize: '16px' }}>
              Sign in with ${provider}
            </button>
          ) : (
            <div>
              <h2>Welcome, {session?.user?.email}</h2>
              <button onClick={signOut} style={{ padding: '10px 20px', margin: '10px', fontSize: '16px' }}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      );
    }
    export default Auth;
    `;    
    fs.writeFileSync(path.join(projectPath, 'src', 'Auth.jsx'), authContent);

    // Add example environment variables
    const envContent = `
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
    `;
    fs.writeFileSync(path.join(projectPath, '.env'), envContent);

    console.log('Supabase configuration and authentication setup completed.');
  }

  // Update App.jsx to use Auth component
  const appContent = `
import React from 'react';
import Auth from './Auth';
import './App.css';

function App() {
  return (
    <div>
      <Auth />
    </div>
  );
}

export default App;
  `;
  fs.writeFileSync(path.join(projectPath, 'src', 'App.jsx'), appContent);

  console.log('\nProject setup complete! To get started:');
  console.log(`\n  cd ${projectName}`);
  console.log('  npm install');
  console.log('  npm run dev');

  rl.close();
}

initApp().catch((error) => {
  console.error('Error during project setup:', error);
  rl.close();
});
