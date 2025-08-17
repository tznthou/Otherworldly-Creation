class SoundManager {
  private context: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      // 支援不同瀏覽器的 AudioContext
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.context = new AudioCtx();
    } catch (error) {
      console.warn('無法初始化 AudioContext:', error);
    }
  }

  async loadSound(name: string, url: string): Promise<void> {
    if (!this.context) {
      console.warn('AudioContext 未初始化，無法載入音效');
      return;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
    } catch (error) {
      console.warn(`載入音效失敗: ${name}`, error);
    }
  }

  async playSound(name: string, volume?: number): Promise<void> {
    if (!this.enabled || !this.context || !this.sounds.has(name)) {
      return;
    }

    try {
      // 確保 AudioContext 已啟動
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      const audioBuffer = this.sounds.get(name)!;
      const source = this.context.createBufferSource();
      const gainNode = this.context.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = volume ?? this.volume;

      // 連接音頻節點
      source.connect(gainNode);
      gainNode.connect(this.context.destination);

      // 播放音效
      source.start();
    } catch (error) {
      console.warn(`播放音效失敗: ${name}`, error);
    }
  }

  // 生成簡單的音效（不需要外部文件）
  async generateAndPlayTone(frequency: number, duration: number, type: OscillatorType = 'sine'): Promise<void> {
    if (!this.enabled || !this.context) {
      return;
    }

    try {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      // 設置音量包絡線
      gainNode.gain.setValueAtTime(0, this.context.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);

      oscillator.start(this.context.currentTime);
      oscillator.stop(this.context.currentTime + duration);
    } catch (error) {
      console.warn('生成音效失敗:', error);
    }
  }

  // 預設音效
  async playClickSound(): Promise<void> {
    await this.generateAndPlayTone(800, 0.1, 'square');
  }

  async playSuccessSound(): Promise<void> {
    // 成功音效 (上升音調)
    await this.generateAndPlayTone(523, 0.15, 'sine'); // C5
    setTimeout(() => this.generateAndPlayTone(659, 0.15, 'sine'), 150); // E5
    setTimeout(() => this.generateAndPlayTone(784, 0.2, 'sine'), 300); // G5
  }

  async playErrorSound(): Promise<void> {
    // 錯誤音效 (下降音調)
    await this.generateAndPlayTone(400, 0.2, 'sawtooth');
    setTimeout(() => this.generateAndPlayTone(300, 0.3, 'sawtooth'), 200);
  }

  async playNotificationSound(): Promise<void> {
    // 通知音效 (短促的鈴聲)
    await this.generateAndPlayTone(1000, 0.1, 'sine');
    setTimeout(() => this.generateAndPlayTone(1200, 0.1, 'sine'), 100);
  }

  async playTypingSound(): Promise<void> {
    // 打字音效 (隨機頻率的短音)
    const frequency = 400 + Math.random() * 200;
    await this.generateAndPlayTone(frequency, 0.05, 'square');
  }

  async playSaveSound(): Promise<void> {
    // 保存音效 (和諧音調)
    await this.generateAndPlayTone(440, 0.2, 'sine'); // A4
    setTimeout(() => this.generateAndPlayTone(554, 0.2, 'sine'), 100); // C#5
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }

  async preloadDefaultSounds(): Promise<void> {
    // 這個方法可以在應用啟動時調用來預載入常用音效
    // 由於我們使用生成音效，不需要實際載入文件
    console.log('SoundManager: 準備就緒，支援生成音效');
  }
}

// 導出單例實例
export const soundManager = new SoundManager();
export default soundManager;