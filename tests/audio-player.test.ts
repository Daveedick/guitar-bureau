import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from '../app/utils/audio-player'
class FakeAudio extends EventTarget {
  src = ''
  preload = ''
  currentTime = 0
  duration = 40
  paused = true
  pending: { resolve: () => void; reject: (error: Error) => void }[] = []
  play = vi.fn(() => {
    this.paused = false
    return new Promise<void>((resolve, reject) => this.pending.push({ resolve, reject }))
  })
  pause = vi.fn(() => {
    this.paused = true
  })
  load = vi.fn()
  removeAttribute() {
    this.src = ''
  }
  emit(name: string) {
    this.dispatchEvent(new Event(name))
  }
}
const players: AudioPlayer[] = []
function setup() {
  const audios: FakeAudio[] = []
  const player = new AudioPlayer(vi.fn(), () => {
    const audio = new FakeAudio()
    audios.push(audio)
    return audio as unknown as HTMLAudioElement
  })
  players.push(player)
  player.select('/clean/1.mp3')
  return { player, audios }
}
afterEach(() => {
  players.forEach((p) => p.dispose())
  players.length = 0
  vi.useRealTimers()
})
describe('audio lifecycle and races', () => {
  it('does not create or load media until explicit play, even after paused selection', () => {
    const { player, audios } = setup()
    player.select('/crunch/5.mp3')
    expect(audios).toHaveLength(0)
    expect(player.state.wantsPlay).toBe(false)
  })
  it('switches from the beginning while preserving playing intent and retiring the old source', async () => {
    const { player, audios } = setup()
    const first = player.play()
    audios[0]!.pending[0]!.resolve()
    await first
    audios[0]!.currentTime = 20
    player.select('/crunch/3.mp3')
    expect(audios[0]!.paused).toBe(true)
    expect(audios[0]!.src).toBe('')
    expect(audios[1]!.src).toBe('/crunch/3.mp3')
    expect(player.state.time).toBe(0)
    expect(player.state.wantsPlay).toBe(true)
    audios[1]!.pending[0]!.resolve()
    await Promise.resolve()
    expect(player.state.status).toBe('playing')
  })
  it('preserves pause, resets progress and does not request the selected track', async () => {
    const { player, audios } = setup()
    const first = player.play()
    audios[0]!.pending[0]!.resolve()
    await first
    player.pause()
    player.select('/clean/4.mp3')
    expect(audios).toHaveLength(1)
    expect(player.state.time).toBe(0)
    expect(player.state.wantsPlay).toBe(false)
  })
  it('switches pickups at the exact media time, even between timeupdate events', async () => {
    const { player, audios } = setup()
    const first = player.play()
    audios[0]!.pending[0]!.resolve()
    await first
    audios[0]!.currentTime = 8.5
    expect(player.state.time).toBe(0)
    player.select('/clean/2.mp3', { preserveTime: true })
    expect(audios[0]!.paused).toBe(true)
    expect(audios[1]!.currentTime).toBe(8.5)
    expect(player.state.time).toBe(8.5)
    audios[1]!.emit('loadedmetadata')
    audios[1]!.pending[0]!.resolve()
    await Promise.resolve()
    expect(player.state.status).toBe('playing')
    expect(player.state.time).toBe(8.5)
  })
  it('retains a paused offset through multiple lazy selections and resumes there', async () => {
    const { player, audios } = setup()
    const first = player.play()
    audios[0]!.pending[0]!.resolve()
    await first
    audios[0]!.currentTime = 8.5
    player.pause()
    player.select('/clean/2.mp3', { preserveTime: true })
    player.select('/clean/5.mp3', { preserveTime: true })
    expect(audios).toHaveLength(1)
    expect(player.state.time).toBe(8.5)
    expect(player.state.wantsPlay).toBe(false)
    const resumed = player.play()
    expect(audios[1]!.src).toBe('/clean/5.mp3')
    expect(audios[1]!.currentTime).toBe(8.5)
    audios[1]!.pending[0]!.resolve()
    await resumed
  })
  it('retains offset through loading races and ignores retired metadata', async () => {
    const { player, audios } = setup()
    void player.play()
    audios[0]!.currentTime = 8.5
    player.select('/clean/2.mp3', { preserveTime: true })
    // A loading element can temporarily report zero before completing its initial seek.
    audios[1]!.currentTime = 0
    audios[1]!.emit('timeupdate')
    player.select('/clean/3.mp3', { preserveTime: true })
    audios[1]!.duration = 4
    audios[1]!.emit('loadedmetadata')
    expect(audios[2]!.currentTime).toBe(8.5)
    expect(player.state.time).toBe(8.5)
    audios[2]!.emit('loadedmetadata')
    audios[2]!.pending[0]!.resolve()
    await Promise.resolve()
    expect(player.state.wantsPlay).toBe(true)
    expect(audios.filter((a) => !a.paused)).toHaveLength(1)
  })
  it('pauses at the end of a shorter replacement without restarting', async () => {
    const { player, audios } = setup()
    void player.play()
    audios[0]!.currentTime = 30
    player.select('/clean/2.mp3', { preserveTime: true })
    audios[1]!.duration = 22
    audios[1]!.emit('loadedmetadata')
    audios[1]!.pending[0]!.resolve()
    await Promise.resolve()
    expect(player.state.time).toBe(22)
    expect(player.state.status).toBe('paused')
    expect(audios[1]!.paused).toBe(true)
  })
  it('retry and pause during replacement loading do not lose the offset', async () => {
    const { player, audios } = setup()
    void player.play()
    audios[0]!.currentTime = 8.5
    player.select('/clean/2.mp3', { preserveTime: true })
    player.pause()
    audios[1]!.currentTime = 0
    audios[1]!.emit('error')
    player.retry()
    expect(audios[2]!.currentTime).toBe(8.5)
    player.pause()
    audios[2]!.emit('loadedmetadata')
    audios[2]!.pending[0]!.resolve()
    await Promise.resolve()
    expect(player.state.time).toBe(8.5)
    expect(player.state.wantsPlay).toBe(false)
  })
  it('tone change clears a pending pickup offset', () => {
    const { player, audios } = setup()
    void player.play()
    audios[0]!.currentTime = 8.5
    player.select('/clean/2.mp3', { preserveTime: true })
    player.select('/crunch/2.mp3')
    expect(audios[2]!.currentTime).toBe(0)
    expect(player.state.time).toBe(0)
  })
  it('ignores out-of-order play promises, errors and metadata from retired tracks', async () => {
    const { player, audios } = setup()
    const first = player.play()
    player.select('/clean/2.mp3')
    player.select('/crunch/5.mp3')
    audios[2]!.pending[0]!.resolve()
    await Promise.resolve()
    audios[0]!.pending[0]!.resolve()
    await first
    audios[1]!.pending[0]!.reject(new Error('stale'))
    await Promise.resolve()
    audios[0]!.emit('error')
    audios[1]!.emit('loadedmetadata')
    expect(player.state.status).toBe('playing')
    expect(player.state.duration).toBe(0)
    expect(audios.filter((a) => !a.paused)).toHaveLength(1)
  })
  it('pause during loading prevents delayed resolution from playing', async () => {
    const { player, audios } = setup()
    const pending = player.play()
    player.pause()
    audios[0]!.pending[0]!.resolve()
    await pending
    audios[0]!.emit('playing')
    expect(audios[0]!.paused).toBe(true)
    expect(player.state.status).toBe('paused')
  })
  it('does not let an older play attempt cancel a newer play on the same element', async () => {
    const { player, audios } = setup()
    const old = player.play()
    player.pause()
    const current = player.play()
    audios[0]!.pending[1]!.resolve()
    await current
    audios[0]!.pending[0]!.resolve()
    await old
    expect(player.state.status).toBe('playing')
    expect(audios[0]!.paused).toBe(false)
  })
  it('surfaces failures and retries with a fresh media element', async () => {
    const { player, audios } = setup()
    const pending = player.play()
    audios[0]!.pending[0]!.reject(new Error('network'))
    await pending
    expect(player.state.status).toBe('error')
    player.retry()
    expect(audios[1]!.src).toBe('/clean/1.mp3')
    audios[1]!.pending[0]!.resolve()
    await Promise.resolve()
    expect(player.state.status).toBe('playing')
  })
  it('times out a hung load and can retry', () => {
    vi.useFakeTimers()
    const { player } = setup()
    void player.play()
    vi.advanceTimersByTime(15000)
    expect(player.state.status).toBe('error')
    expect(player.state.wantsPlay).toBe(false)
  })
  it('disposes on navigation and ignores pending work', async () => {
    const { player, audios } = setup()
    const pending = player.play()
    player.dispose()
    audios[0]!.pending[0]!.resolve()
    await pending
    expect(audios[0]!.paused).toBe(true)
    expect(audios[0]!.src).toBe('')
    expect(player.state.wantsPlay).toBe(false)
  })
  it('enforces one active player across instances', () => {
    const a = setup(),
      b = setup()
    void a.player.play()
    void b.player.play()
    expect(a.audios[0]!.paused).toBe(true)
    expect(a.player.state.wantsPlay).toBe(false)
  })
  it('clamps seeking and stops intent on ended', () => {
    const { player, audios } = setup()
    void player.play()
    audios[0]!.emit('loadedmetadata')
    player.seek(90)
    expect(audios[0]!.currentTime).toBe(40)
    player.seek(-3)
    expect(player.state.time).toBe(0)
    audios[0]!.emit('ended')
    expect(player.state.wantsPlay).toBe(false)
  })
})
