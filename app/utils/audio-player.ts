export interface PlayerState {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
  wantsPlay: boolean
  time: number
  duration: number
  error: string
}
let activePlayer: AudioPlayer | undefined

/** Each source owns its media element and listeners. Retired async work cannot mutate its successor. */
export class AudioPlayer {
  state: PlayerState = { status: 'idle', wantsPlay: false, time: 0, duration: 0, error: '' }
  private audio?: HTMLAudioElement
  private src = ''
  // Keep the requested offset even while the replacement has no metadata yet.
  private pendingTime: number | undefined
  private generation = 0
  private attempt = 0
  private disposed = false
  private cleanups: (() => void)[] = []
  private timeout?: ReturnType<typeof setTimeout>
  constructor(
    private notify: (state: PlayerState) => void,
    private factory = () => new Audio(),
  ) {}
  private publish(patch: Partial<PlayerState>) {
    Object.assign(this.state, patch)
    this.notify({ ...this.state })
  }
  private clearTimeout() {
    clearTimeout(this.timeout)
    this.timeout = undefined
  }
  private release() {
    this.generation++
    this.attempt++
    this.clearTimeout()
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
      this.audio = undefined
    }
  }
  select(src: string, options: { preserveTime?: boolean } = {}) {
    if (this.disposed || this.src === src) return
    const resume = this.state.wantsPlay
    const time = options.preserveTime ? this.currentTime() : 0
    this.release()
    this.src = src
    this.pendingTime = time > 0 ? time : undefined
    this.publish({
      time,
      duration: 0,
      error: '',
      status: time > 0 ? 'paused' : 'idle',
      wantsPlay: resume,
    })
    if (resume) void this.play()
  }
  private currentTime() {
    return this.pendingTime ?? this.audio?.currentTime ?? this.state.time
  }
  private create() {
    const audio = this.factory()
    this.audio = audio
    const generation = this.generation
    const listen = (event: string, fn: () => void) => {
      const handler = () => {
        if (!this.disposed && this.audio === audio && generation === this.generation) fn()
      }
      audio.addEventListener(event, handler)
      this.cleanups.push(() => audio.removeEventListener(event, handler))
    }
    listen('loadedmetadata', () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      this.publish({ duration })
      if (this.pendingTime !== undefined && duration > 0) {
        const time = Math.min(this.pendingTime, duration)
        this.pendingTime = undefined
        audio.currentTime = time
        this.publish({ time })
        // A shorter take ends here, rather than unexpectedly restarting its intro.
        if (time >= duration) this.pause()
      }
    })
    listen('durationchange', () =>
      this.publish({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 }),
    )
    listen('timeupdate', () => this.publish({ time: this.currentTime() }))
    listen('waiting', () => {
      if (this.state.wantsPlay) {
        this.publish({ status: 'loading' })
        this.armTimeout()
      }
    })
    listen('playing', () => {
      if (!this.state.wantsPlay) {
        audio.pause()
        return
      }
      this.clearTimeout()
      this.publish({ status: 'playing' })
    })
    listen('pause', () => {
      if (audio.paused && this.state.status !== 'error') {
        this.clearTimeout()
        this.publish({ wantsPlay: false, status: 'paused' })
      }
    })
    listen('ended', () => {
      this.clearTimeout()
      this.publish({ wantsPlay: false, status: 'paused', time: audio.duration })
    })
    listen('error', () =>
      this.fail('Не удалось загрузить запись. Проверьте соединение и попробуйте ещё раз.'),
    )
    audio.preload = 'none'
    audio.src = this.src
    // HTML media retains this as the default start position before metadata loads.
    // https://html.spec.whatwg.org/multipage/media.html#dom-media-currenttime
    if (this.pendingTime !== undefined) audio.currentTime = this.pendingTime
    return audio
  }
  private armTimeout() {
    this.clearTimeout()
    this.timeout = setTimeout(
      () => this.fail('Запись загружается слишком долго. Попробуйте ещё раз.'),
      15000,
    )
  }
  private fail(error: string) {
    this.clearTimeout()
    this.attempt++
    this.publish({ status: 'error', wantsPlay: false, error })
    this.audio?.pause()
  }
  async play() {
    if (this.disposed || !this.src) return
    if (activePlayer && activePlayer !== this) activePlayer.pause()
    activePlayer = this
    if (this.state.status === 'error') {
      this.pendingTime = this.currentTime()
      this.release()
    }
    const audio = this.audio ?? this.create()
    const generation = this.generation
    const attempt = ++this.attempt
    this.publish({ wantsPlay: true, status: 'loading', error: '' })
    this.armTimeout()
    try {
      await audio.play()
      if (this.disposed || generation !== this.generation || audio !== this.audio) {
        audio.pause()
        return
      }
      if (attempt !== this.attempt) {
        if (!this.state.wantsPlay) audio.pause()
        return
      }
      this.clearTimeout()
      this.publish({ status: 'playing' })
    } catch (error) {
      if (
        this.disposed ||
        generation !== this.generation ||
        attempt !== this.attempt ||
        !this.state.wantsPlay
      )
        return
      this.fail(
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'Браузер остановил запуск. Нажмите «Повторить» для воспроизведения.'
          : 'Не удалось воспроизвести запись. Попробуйте ещё раз.',
      )
    }
  }
  pause() {
    this.attempt++
    this.clearTimeout()
    this.publish({ wantsPlay: false, status: 'paused' })
    this.audio?.pause()
  }
  toggle() {
    if (this.state.wantsPlay) this.pause()
    else void this.play()
  }
  retry() {
    const time = this.currentTime()
    this.release()
    this.pendingTime = time > 0 ? time : undefined
    this.publish({ time, duration: 0, status: 'idle', error: '' })
    void this.play()
  }
  seek(time: number) {
    if (this.audio && this.state.duration > 0) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.state.duration))
      this.publish({ time: this.audio.currentTime })
    }
  }
  dispose() {
    this.disposed = true
    this.release()
    if (activePlayer === this) activePlayer = undefined
    this.publish({ wantsPlay: false, status: 'idle' })
  }
}
