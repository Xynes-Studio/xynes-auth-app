# Security Headers Implementation

## Overview

This document outlines the security headers implemented across the Xynes platform to protect against common web vulnerabilities and enhance security posture.

## Implemented Security Headers

### 1. Content Security Policy (CSP)
- **Location**: `src/middleware.ts`
- **Purpose**: Mitigates XSS attacks by controlling resource loading
- **Directives**:
  - `default-src 'self'`: Restricts resources to same origin
  - `script-src 'self' 'nonce-{random}' https://cdn.supabase.io`: Allows scripts from same origin and Supabase CDN with dynamic nonces
  - `style-src 'self' 'unsafe-inline'`: Allows styles from same origin and inline styles
  - `img-src 'self' data: https:`: Allows images from same origin, data URIs, and HTTPS sources
  - `connect-src 'self' https://*.supabase.co https://api.xynes.com`: Restricts AJAX/fetch requests
  - `frame-ancestors 'none'`: Prevents clickjacking by disallowing framing
  - `report-uri /api/csp-report`: Reports violations to dedicated endpoint

### 2. X-Frame-Options
- **Location**: `next.config.mjs` and `next.config.ts`
- **Value**: `DENY`
- **Purpose**: Prevents the site from being embedded in frames/iframes, protecting against clickjacking

### 3. X-Content-Type-Options
- **Location**: `next.config.mjs` and `next.config.ts`
- **Value**: `nosniff`
- **Purpose**: Prevents MIME-type sniffing attacks by forcing browsers to respect declared content types

### 4. X-XSS-Protection (Removed)
- **Status**: Removed due to deprecation
- **Reason**: Deprecated header replaced by Content Security Policy (CSP) which provides more comprehensive XSS protection

### 5. Referrer-Policy
- **Location**: `next.config.mjs` and `next.config.ts`
- **Value**: `strict-origin-when-cross-origin`
- **Purpose**: Controls referrer information sent with requests, balancing privacy and functionality

### 6. Permissions-Policy
- **Location**: `next.config.mjs` and `next.config.ts`
- **Value**: `camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=(), vr=()`
- **Purpose**: Disables sensitive browser features to prevent potential abuse

### 7. Strict-Transport-Security (HSTS)
- **Location**: `next.config.mjs` and `next.config.ts`
- **Value**: `max-age=63072000; includeSubDomains; preload`
- **Purpose**: Forces HTTPS connections and prevents downgrade attacks

### 8. Cross-Origin-Embedder-Policy (COEP)
- **Location**: `next.config.mjs` and `next.config.ts`
- **Value**: `require-corp`
- **Purpose**: Prevents cross-origin information leakage by requiring CORP/COEP headers

### 9. Cross-Origin-Opener-Policy (COOP)
- **Location**: `next.config.mjs` and `next.config.ts`
- **Value**: `same-origin`
- **Purpose**: Isolates the browser context to prevent side-channel attacks

### 10. Cross-Origin-Resource-Policy (CORP)
- **Location**: `next.config.mjs` and `next.config.ts`
- **Value**: `same-origin`
- **Purpose**: Controls how resources are loaded across origins to prevent information leakage

## Testing

Security headers are tested through:
- Middleware tests in `src/middleware.test.ts` for CSP and nonce generation
- API route tests in `src/app/api/security-headers/route.test.ts` for general functionality

## Maintenance

When adding new external resources (scripts, styles, etc.), ensure they are added to the appropriate CSP directives in `src/middleware.ts`.

For any changes to security headers, update both the auth app and CMS console web configurations to maintain consistent security posture across the platform.