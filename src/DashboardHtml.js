import { API } from './ApiConstants.js'

export const CSP = [
	`default-src 'self'`,
	`img-src data: blob: 'self'`
].join(';')


export const DashboardHtml = hotReloadEnabled => `<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8">
  <base href="${API.dashboard}/">
  
  <link rel="stylesheet" href="Dashboard.css">
  <script type="module" src="Dashboard.js"></script>
  
  <link rel="preload" href="${API.state}" as="fetch" crossorigin>
  
  <link rel="modulepreload" href="ApiConstants.js">
  <link rel="modulepreload" href="ApiCommander.js">
  <link rel="modulepreload" href="Filename.js">
  <link rel="modulepreload" href="DashboardStore.js">
  <link rel="modulepreload" href="DashboardDom.js">
  <link rel="preload" href="Logo.svg" as="image">
  
  <link rel="icon" href="data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m235 33.7v202c0 9.19-5.81 14-17.4 14-11.6 0-17.4-4.83-17.4-14v-151c-0.115-4.49-6.72-5.88-8.46-0.87l-48.3 155c-2.22 7.01-7.72 10.1-16 9.9-3.63-0.191-7.01-1.14-9.66-2.89-2.89-1.72-4.83-4.34-5.57-7.72-11.1-37-22.6-74.3-34.1-111-4.34-14-8.95-31.4-14-48.3-1.82-4.83-8.16-5.32-8.46 1.16v156c0 9.19-5.81 14-17.4 14-11.6 0-17.4-4.83-17.4-14v-207c0-5.74 2.62-13.2 9.39-16.3 7.5-3.14 15-4.05 21.8-3.8 3.14 0 6.03 0.686 8.95 1.46 3.14 0.797 6.03 1.98 8.7 3.63 2.65 1.38 5.32 3.14 7.5 5.57 2.22 2.22 3.87 4.83 5.07 7.72l45.8 157c4.63-15.9 32.4-117 33.3-121 4.12-13.8 7.72-26.5 10.9-38.7 1.16-2.65 2.89-5.32 5.07-7.5 2.15-2.15 4.58-4.12 7.5-5.32 2.65-1.57 5.57-2.89 8.46-3.63 3.14-0.797 9.44-0.988 12.1-0.988 11.6 1.07 29.4 9.14 29.4 27z' fill='%23808080'/%3E%3C/svg%3E">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="HTTP Mock Server">
  <title>Mockaton</title>
</head>
<body>
${hotReloadEnabled ? `<script type="module" src="DashboardDevHotReload.js"></script>` : '' }
</body>
</html>
`
