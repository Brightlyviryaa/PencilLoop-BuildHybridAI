/** The in-app camera needs getUserMedia and a secure context (https or localhost). */
export function cameraSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext
}
