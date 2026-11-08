const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const esbuild = require('esbuild');
const { chromium } = require('playwright');

(async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'transport-map-test-'));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const runtime of ['react18', 'next-react19']) {
      const alias = runtime === 'next-react19' ? {
        react: path.dirname(require.resolve('next/dist/compiled/react')),
        'react-dom': path.dirname(require.resolve('next/dist/compiled/react-dom')),
      } : {};
      const bundle = path.join(output, runtime + '.js');
      await esbuild.build({
        stdin: { loader: 'tsx', resolveDir: path.resolve(__dirname, '..'), contents: `
          import React, { StrictMode, useEffect } from 'react';
          import { createRoot } from 'react-dom/client';
          import { MapContainer } from './components/maps/MapContainer';
          import { Marker, useMap } from 'react-leaflet';
          import AppError from './app/error';
          import L from 'leaflet';
          const root = createRoot(document.getElementById('root'));
          const icon = L.divIcon({html:'test'});
          window.maps = [];
          function Probe() {
            const map = useMap();
            useEffect(() => { window.currentMap = map; window.maps.push(map); }, [map]);
            return <Marker position={[43.85, 18.4]} icon={icon} />;
          }
          window.showMap = key => root.render(<StrictMode><MapContainer key={key} center={[43.85,18.4]} zoom={6} style={{height:400,width:600}}><Probe /></MapContainer></StrictMode>);
          window.hideMap = () => root.render(null);
          window.showError = () => root.render(<AppError error={new Error('synthetic test error')} reset={() => window.showMap(100)} />);
        ` }, bundle: true, outfile: bundle, alias, define: { 'process.env.NODE_ENV': '"development"' }, jsx: 'automatic', logLevel: 'silent',
      });
      const page = await browser.newPage();
      const failures = [];
      page.on('pageerror', error => failures.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && !message.text().startsWith('App error:')) failures.push(message.text());
      });
      await page.setContent('<!doctype html><html><body><div id="root"></div></body></html>');
      await page.addScriptTag({ path: bundle });
      for (let i = 0; i < 5; i++) {
        await page.evaluate(key => window.showMap(key), i);
        await page.waitForFunction(() => document.querySelectorAll('.leaflet-marker-icon').length === 1);
        assert.equal(await page.locator('.leaflet-container').count(), 1);
        await page.evaluate(() => window.hideMap());
        await page.waitForFunction(() => !document.querySelector('.leaflet-container'));
      }
      assert.equal(await page.evaluate(() => window.maps.every(map => !map.getContainer().isConnected)), true);
      await page.evaluate(() => window.showError());
      await page.getByText('Nešto nije u redu').waitFor();
      assert.equal(await page.locator('html').count(), 1);
      assert.equal(await page.locator('body').count(), 1);
      await page.getByRole('button', {name:'Pokušaj ponovo'}).click();
      await page.waitForFunction(() => document.querySelectorAll('.leaflet-marker-icon').length === 1);
      assert.deepEqual(failures, []);
      console.log(`PASS ${runtime}: Strict Mode remounts, map cleanup, error fallback and retry`);
      await page.close();
    }
  } finally { await browser.close(); await fs.rm(output, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
