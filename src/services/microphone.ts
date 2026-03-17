// ─── Microphone service ──────────────────────────────────────────────────────
// Side-effect integration for the Web Audio API microphone.
// Provides audio level analysis for ritual conditions.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AudioAnalysis {
  level: number       // 0-1 energy level (1 = loud)
  isRhythmic: boolean // true if periodic onsets detected
  isSilent: boolean   // true if level below silence threshold
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SILENCE_THRESHOLD = 0.05
const FFT_SIZE = 256

/** Minimum number of onsets in the buffer to consider rhythmic. */
const MIN_ONSETS_FOR_RHYTHM = 3

/** Onset detection threshold — relative jump in energy. */
const ONSET_THRESHOLD = 1.5

/** Number of energy frames to keep for rhythm detection. */
const ENERGY_BUFFER_SIZE = 30

// ─── State ────────────────────────────────────────────────────────────────────

let audioContext: AudioContext | null = null
let analyserNode: AnalyserNode | null = null
let sourceNode: MediaStreamAudioSourceNode | null = null
let activeStream: MediaStream | null = null

/** Rolling buffer of recent energy values for onset detection. */
const energyBuffer: number[] = []

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Start the microphone and set up the audio analyser.
 * Returns null if the microphone is unavailable or the user denies permission.
 */
export async function startMicrophone(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })

    audioContext = new AudioContext()
    analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = FFT_SIZE
    analyserNode.smoothingTimeConstant = 0.8

    sourceNode = audioContext.createMediaStreamSource(stream)
    sourceNode.connect(analyserNode)

    activeStream = stream
    energyBuffer.length = 0

    return stream
  } catch {
    return null
  }
}

/**
 * Stop the microphone and release all audio resources.
 */
export function stopMicrophone(): void {
  if (sourceNode) {
    sourceNode.disconnect()
    sourceNode = null
  }
  if (analyserNode) {
    analyserNode = null
  }
  if (audioContext) {
    audioContext.close().catch(() => {})
    audioContext = null
  }
  if (activeStream) {
    for (const track of activeStream.getTracks()) {
      track.stop()
    }
    activeStream = null
  }
  energyBuffer.length = 0
}

/**
 * Analyze the current audio level from the microphone.
 * Returns null if the microphone is not active.
 */
export function analyzeAudioLevel(): AudioAnalysis | null {
  if (!analyserNode) return null

  const dataArray = new Uint8Array(analyserNode.frequencyBinCount)
  analyserNode.getByteTimeDomainData(dataArray)

  // Compute RMS energy
  let sumSquares = 0
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128
    sumSquares += normalized * normalized
  }
  const rms = Math.sqrt(sumSquares / dataArray.length)
  const level = Math.min(1, rms * 4) // Scale up for sensitivity

  // Track energy for onset detection
  energyBuffer.push(level)
  if (energyBuffer.length > ENERGY_BUFFER_SIZE) {
    energyBuffer.shift()
  }

  // Detect onsets (sudden energy increases)
  const isRhythmic = detectRhythm()
  const isSilent = level < SILENCE_THRESHOLD

  return { level, isRhythmic, isSilent }
}

/** Check if the microphone is currently active. */
export function isMicrophoneActive(): boolean {
  return activeStream !== null && analyserNode !== null
}

// ─── Internals ──────────────────────────────────────────────────────────────

function detectRhythm(): boolean {
  if (energyBuffer.length < 6) return false

  // Single pass: find onset positions
  const onsetPositions: number[] = []
  for (let i = 1; i < energyBuffer.length; i++) {
    if (energyBuffer[i - 1] > 0.01 && energyBuffer[i] / energyBuffer[i - 1] > ONSET_THRESHOLD) {
      onsetPositions.push(i)
    }
  }

  if (onsetPositions.length < MIN_ONSETS_FOR_RHYTHM) return false

  // Check regularity via coefficient of variation of inter-onset intervals
  const intervals: number[] = []
  for (let i = 1; i < onsetPositions.length; i++) {
    intervals.push(onsetPositions[i] - onsetPositions[i - 1])
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const variance = intervals.reduce((s, iv) => s + (iv - avgInterval) ** 2, 0) / intervals.length
  const cv = Math.sqrt(variance) / avgInterval

  return cv < 0.5
}
