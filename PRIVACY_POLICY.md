# Privacy Policy for ChromaMath

**Last updated:** September 14, 2026

ChromaMath ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy explains our practices regarding data collection, use, and disclosure when you use the ChromaMath Chrome Extension.

---

## 1. Summary: No Personal Data Collected
**ChromaMath does not collect, store, track, sell, or transmit any Personally Identifiable Information (PII).** 

There are no third-party analytics trackers, advertising networks, telemetry scripts, or remote tracking servers embedded in the extension.

---

## 2. Information Handled by the Extension

### A. Local Storage & Preferences
- **Settings:** Your display preferences (such as selected color palette, numbered badge toggles, and UI states) are saved locally in your browser using Chrome's `chrome.storage.sync` and `chrome.storage.local` APIs.
- **Equation Cache:** Deconstructed formulas are cached locally on your device to enable instant zero-latency reloading while reading papers. This cache remains strictly local on your machine and is never sent to external servers.

### B. User-Provided API Keys
- If you supply your personal Google Gemini API key, it is stored securely in your browser's private extension storage (`chrome.storage.sync`).
- Your API key is used **exclusively** to authenticate direct HTTPS requests from your browser to Google's Generative Language API. It is never shared, logged, or sent to any developer-owned server.

### C. Mathematical Formulas & Snipped Images
- When you click "Explain" on an equation or use the screen snip tool, the extracted LaTeX string or cropped formula image is sent directly from your browser to the Google Gemini API (`generativelanguage.googleapis.com`) to generate the mathematical deconstruction.
- We do not operate any intermediate proxy servers; your browser communicates directly with Google's API.

---

## 3. Chrome Permissions & Why They Are Needed

| Permission | Purpose |
| :--- | :--- |
| **`activeTab`** | Allows the extension to detect mathematical equations on your active paper tab and capture a bounding box when you explicitly trigger the screen snip tool. |
| **`sidePanel`** | Renders the interactive color-coded formula deconstruction, ADEPT framework, and glossary side-by-side with your paper. |
| **`storage`** | Saves your chosen color palette, display settings, and offline document equation cache locally. |
| **`offscreen`** | Provides an offscreen canvas context in Manifest V3 to crop user-selected formula regions from tab screenshots before performing OCR. |
| **`contextMenus`** | Adds convenient right-click options to explain selected math or trigger the snipping tool. |
| **Host Permissions (`<all_urls>`, `arxiv.org`, `ar5iv.org`)** | Allows the content script to detect mathematical equations (MathML, KaTeX, MathJax) on arXiv, Wikipedia, and academic websites. |

---

## 4. Third-Party Services
The extension connects only to:
- **Google Generative AI (Gemini API):** Used solely for formula OCR and mathematical deconstruction when invoked by the user. Usage is governed by [Google's Privacy Policy](https://policies.google.com/privacy) and [Google AI Terms of Service](https://ai.google.dev/terms).

---

## 5. Security of Your Information
All communication with Google's Gemini API is encrypted via standard Transport Layer Security (TLS/HTTPS). No user data or browsing activity is ever transmitted to or stored on external servers.

---

## 6. Children's Privacy
ChromaMath does not address or knowingly collect any information from children under the age of 13.

---

## 7. Changes to This Privacy Policy
We may update this Privacy Policy from time to time. Any changes will be posted directly to this repository with an updated revision date.

---

## 8. Contact Us
If you have any questions or suggestions regarding this Privacy Policy, please open an issue on our GitHub repository:
- **GitHub Repository:** [https://github.com/notabee/chromamath](https://github.com/notabee/chromamath)
- **Issues:** [https://github.com/notabee/chromamath/issues](https://github.com/notabee/chromamath/issues)
