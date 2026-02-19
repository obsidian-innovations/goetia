import type { Sigil } from '@engine/sigil/Types'
import type { ClashResult } from '@engine/pvp/ClashResolver'
import type { Hex } from '@engine/pvp/HexSystem'

// ─── Types ─────────────────────────────────────────────────────────────────

export type NetworkStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ClashChallenge {
  challengeId: string
  challengerId: string
  targetId: string
  sigil: Sigil
  sentAt: number
}

export interface NetworkCallbacks {
  onClashResult?: (result: ClashResult, challengeId: string) => void
  onIncomingHex?: (hex: Hex) => void
  onStatusChange?: (status: NetworkStatus) => void
}

// ─── Message shapes (internal) ─────────────────────────────────────────────

interface WireMessage {
  type: string
  payload: unknown
}

// ─── Service class ─────────────────────────────────────────────────────────

class NetworkService {
  private _status: NetworkStatus = 'disconnected'
  private _ws: WebSocket | null = null
  private _callbacks: NetworkCallbacks = {}

  get status(): NetworkStatus {
    return this._status
  }

  /** Connect to the PvP WebSocket server. No-ops if already connected. */
  connect(serverUrl: string): void {
    if (this._status === 'connected' || this._status === 'connecting') return

    this._setStatus('connecting')
    try {
      this._ws = new WebSocket(serverUrl)

      this._ws.onopen = () => {
        this._setStatus('connected')
      }

      this._ws.onclose = () => {
        this._ws = null
        this._setStatus('disconnected')
      }

      this._ws.onerror = () => {
        this._setStatus('error')
      }

      this._ws.onmessage = (event: MessageEvent) => {
        this._handleMessage(event.data as string)
      }
    } catch {
      this._setStatus('error')
    }
  }

  /** Close the WebSocket connection. */
  disconnect(): void {
    if (this._ws) {
      this._ws.close()
      this._ws = null
    }
    this._setStatus('disconnected')
  }

  /** Register event callbacks. Can be called multiple times to extend. */
  setCallbacks(callbacks: NetworkCallbacks): void {
    this._callbacks = { ...this._callbacks, ...callbacks }
  }

  /** Send a clash challenge to a target player. */
  sendClashChallenge(challengerId: string, targetId: string, sigil: Sigil): void {
    const challenge: ClashChallenge = {
      challengeId: `clash-${challengerId}-${Date.now()}`,
      challengerId,
      targetId,
      sigil,
      sentAt: Date.now(),
    }
    this._send({ type: 'clash_challenge', payload: challenge })
  }

  /** Send a hex to a target player. */
  sendHex(targetId: string, hex: Hex): void {
    this._send({ type: 'hex', payload: { targetId, hex } })
  }

  /** Register a callback for incoming clash results. */
  onClashResult(callback: (result: ClashResult, challengeId: string) => void): void {
    this._callbacks.onClashResult = callback
  }

  /** Register a callback for incoming hexes. */
  onIncomingHex(callback: (hex: Hex) => void): void {
    this._callbacks.onIncomingHex = callback
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private _send(message: WireMessage): void {
    if (this._ws && this._status === 'connected') {
      this._ws.send(JSON.stringify(message))
    }
  }

  private _handleMessage(data: string): void {
    let message: WireMessage
    try {
      message = JSON.parse(data) as WireMessage
    } catch {
      return  // ignore malformed JSON
    }

    switch (message.type) {
      case 'clash_result': {
        const p = message.payload as { result: ClashResult; challengeId: string }
        this._callbacks.onClashResult?.(p.result, p.challengeId)
        break
      }
      case 'incoming_hex': {
        this._callbacks.onIncomingHex?.(message.payload as Hex)
        break
      }
    }
  }

  private _setStatus(status: NetworkStatus): void {
    this._status = status
    this._callbacks.onStatusChange?.(status)
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

export const networkService = new NetworkService()
