const DEFAULT_CONFIG = Object.freeze({
  runtimeMode: "rust_wasm",
  strength: 0.78,
  minSuppressionGain: 0.14,
  nearFieldBias: 0.51,
  presenceBoost: 0.23,
  rumbleDamp: 0.42,
  targetSpeakerLock: false,
  targetLockSensitivity: 0.62,
})

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function clamp01(value) {
  return clamp(value, 0, 1)
}

function scoreRange(value, low, high) {
  if (high <= low) return value >= high ? 1 : 0
  return clamp01((value - low) / (high - low))
}

function normalizeRuntimeMode(rawMode) {
  const normalized = String(rawMode || "").toLowerCase()
  if (normalized === "neural_stub") return "neural_stub"
  if (normalized === "rust_wasm") return "rust_wasm"
  return "heuristic"
}

class RustVoiceCoreBridge {
  constructor(url, sampleRate, logError) {
    this.url = typeof url === "string" ? url : ""
    this.sampleRate = sampleRate
    this.logError = typeof logError === "function" ? logError : () => {}
    this.instance = null
    this.exports = null
    this.memory = null
    this.ready = false
    this.capacity = 0
    this.inputPtr = 0
    this.outputPtr = 0
    this.metricsPtr = 0
    this.initPromise = this.init()
  }

  async init() {
    if (!this.url || typeof fetch !== "function" || typeof WebAssembly === "undefined") return
    const response = await fetch(this.url)
    if (!response.ok) {
      throw new Error(`wasm fetch failed (${response.status})`)
    }
    const bytes = await response.arrayBuffer()
    const wasm = await WebAssembly.instantiate(bytes, {})
    const exports = wasm?.instance?.exports
    if (!exports || !exports.memory) {
      throw new Error("wasm exports are missing memory")
    }
    const requiredFns = [
      "ve_init",
      "ve_reset",
      "ve_get_metrics_ptr",
      "ve_alloc_f32",
      "ve_free_f32",
      "ve_analyze_frame",
      "ve_render_frame",
    ]
    for (const fnName of requiredFns) {
      if (typeof exports[fnName] !== "function") {
        throw new Error(`wasm export missing: ${fnName}`)
      }
    }
    this.instance = wasm.instance
    this.exports = exports
    this.memory = exports.memory
    this.exports.ve_init(this.sampleRate)
    this.metricsPtr = this.exports.ve_get_metrics_ptr() >>> 0
    this.ensureCapacity(512)
    this.ready = true
  }

  ensureCapacity(frameSize) {
    if (!this.ready && !this.exports) return
    if (frameSize <= this.capacity) return
    const nextCapacity = Math.max(256, 2 ** Math.ceil(Math.log2(frameSize)))
    if (this.inputPtr && this.capacity > 0) {
      this.exports.ve_free_f32(this.inputPtr, this.capacity)
      this.inputPtr = 0
    }
    if (this.outputPtr && this.capacity > 0) {
      this.exports.ve_free_f32(this.outputPtr, this.capacity)
      this.outputPtr = 0
    }
    this.inputPtr = this.exports.ve_alloc_f32(nextCapacity) >>> 0
    this.outputPtr = this.exports.ve_alloc_f32(nextCapacity) >>> 0
    this.capacity = nextCapacity
  }

  reset() {
    if (!this.ready) return
    this.exports.ve_reset()
  }

  analyze(input, frameSize) {
    if (!this.ready || !this.memory) return null
    this.ensureCapacity(frameSize)
    const memoryF32 = new Float32Array(this.memory.buffer)
    memoryF32.set(input, this.inputPtr >>> 2)
    this.exports.ve_analyze_frame(this.inputPtr, frameSize)
    const metricsBase = this.metricsPtr >>> 2
    return {
      rms: memoryF32[metricsBase] || 0,
      voiceRatio: memoryF32[metricsBase + 1] || 0,
      rumbleRatio: memoryF32[metricsBase + 2] || 0,
      zcr: memoryF32[metricsBase + 3] || 0,
    }
  }

  render(output, frameSize, suppressionGain, presenceLift, rumbleReduction, saturationDrive) {
    if (!this.ready || !this.memory) return false
    this.ensureCapacity(frameSize)
    this.exports.ve_render_frame(
      this.outputPtr,
      frameSize,
      suppressionGain,
      presenceLift,
      rumbleReduction,
      saturationDrive,
    )
    const memoryF32 = new Float32Array(this.memory.buffer)
    output.set(memoryF32.subarray(this.outputPtr >>> 2, (this.outputPtr >>> 2) + frameSize))
    return true
  }
}

class HeuristicNearFieldRuntime {
  infer(features, config) {
    const speechLikelihood = clamp01(
      0.42 * features.snrScore +
        0.33 * features.voiceRatioScore +
        0.16 * features.onsetScore -
        0.22 * features.rumblePenalty -
        0.09 * features.zcrPenalty,
    )

    const nearFieldFromLevel = scoreRange(features.snr, 1.25, 5.8)
    const nearFieldScore = clamp01(
      config.nearFieldBias * speechLikelihood +
        (1 - config.nearFieldBias) * (0.58 * nearFieldFromLevel + 0.42 * features.onsetScore),
    )

    return {
      speechLikelihood,
      nearFieldScore,
    }
  }
}

class NeuralStubNearFieldRuntime {
  constructor() {
    this.fallback = new HeuristicNearFieldRuntime()
    this.stubActivation = 0
  }

  infer(features, config) {
    const heuristic = this.fallback.infer(features, config)
    const pseudoModelSignal = clamp01(
      0.45 * features.voiceRatioScore +
        0.22 * features.onsetScore +
        0.2 * scoreRange(features.snr, 1.2, 6.2) -
        0.17 * features.rumblePenalty,
    )
    this.stubActivation = this.stubActivation * 0.8 + pseudoModelSignal * 0.2

    return {
      speechLikelihood: clamp01(heuristic.speechLikelihood * 0.9 + this.stubActivation * 0.1),
      nearFieldScore: clamp01(heuristic.nearFieldScore * 0.86 + this.stubActivation * 0.14),
    }
  }
}

class VoiceEngineProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const processorOptions = options?.processorOptions || {}

    this.config = { ...DEFAULT_CONFIG }
    this.runtimeMode = normalizeRuntimeMode(DEFAULT_CONFIG.runtimeMode)
    this.runtime = new HeuristicNearFieldRuntime()

    this.hpPrevInput = 0
    this.hpPrevOutput = 0
    this.lpSpeech = 0
    this.lpRumble = 0

    this.noiseFloor = 0.0028
    this.smoothedRms = 0
    this.smoothedVoiceRatio = 0.34
    this.smoothedRumbleRatio = 0.17
    this.smoothedRise = 0
    this.smoothedNearFieldScore = 0
    this.suppressionGain = 1
    this.lastSign = 0
    this.isSpeaking = false
    this.speakingHoldBlocks = 0
    this.speechAttackBlocks = 0

    this.targetProfileVoiceRatio = 0.36
    this.targetProfileZcr = 0.1
    this.targetProfileSnrScore = 0.42
    this.targetProfileConfidence = 0
    this.targetMatchScore = 0
    this.targetProfileFrozen = false
    this.targetStableBlocks = 0
    this.targetMismatchBlocks = 0
    this.targetCalibrationFramesRemaining = 0
    this.targetCalibrationFramesTotal = 0

    this.hpScratch = new Float32Array(128)
    this.speechScratch = new Float32Array(128)
    this.rumbleScratch = new Float32Array(128)
    this.rustCore = null
    this.rustFallbackNotified = false

    this.blockCount = 0
    this.metricsInterval = Math.max(1, Math.round(sampleRate / 128 / 15))

    const rustWasmUrl = typeof processorOptions.rustWasmUrl === "string" ? processorOptions.rustWasmUrl : ""
    if (rustWasmUrl) {
      const rustCore = new RustVoiceCoreBridge(rustWasmUrl, sampleRate, () => undefined)
      rustCore.initPromise.catch(() => {
        this.rustCore = null
      })
      this.rustCore = rustCore
    }

    this.applyConfig(processorOptions)
    this.updateFilterCoefficients()

    this.port.onmessage = (event) => {
      const data = event?.data
      if (!data || typeof data !== "object") return
      if (data.type === "config") {
        this.applyConfig(data.config || {})
        return
      }
      if (data.type === "resetTargetProfile") {
        this.resetTargetProfile()
        return
      }
      if (data.type === "calibrateTargetProfile") {
        this.startTargetCalibration(data.durationMs)
        return
      }
      if (data.type === "loadTargetProfile") {
        this.loadTargetProfile(data.profile)
      }
    }
  }

  resetTargetProfile() {
    this.targetProfileVoiceRatio = 0.36
    this.targetProfileZcr = 0.1
    this.targetProfileSnrScore = 0.42
    this.targetProfileConfidence = 0
    this.targetMatchScore = 0
    this.targetProfileFrozen = false
    this.targetStableBlocks = 0
    this.targetMismatchBlocks = 0
    this.targetCalibrationFramesRemaining = 0
    this.targetCalibrationFramesTotal = 0
  }

  startTargetCalibration(durationMs) {
    const parsedDurationMs = Number(durationMs)
    const safeDurationMs = clamp(Number.isFinite(parsedDurationMs) ? parsedDurationMs : 8000, 2000, 20000)
    const frames = Math.max(1, Math.round((sampleRate / 128) * (safeDurationMs / 1000)))
    this.targetCalibrationFramesRemaining = frames
    this.targetCalibrationFramesTotal = frames
    this.targetProfileFrozen = false
    this.targetStableBlocks = 0
    this.targetMismatchBlocks = 0
    this.targetProfileConfidence = Math.min(0.32, this.targetProfileConfidence)
  }

  loadTargetProfile(rawProfile) {
    if (!rawProfile || typeof rawProfile !== "object") return
    const profile = rawProfile
    const parsedVoiceRatio = Number(profile.targetProfileVoiceRatio)
    const parsedZcr = Number(profile.targetProfileZcr)
    const parsedSnrScore = Number(profile.targetProfileSnrScore)
    const parsedConfidence = Number(profile.targetProfileConfidence)
    const parsedSensitivity = Number(profile.targetLockSensitivity)

    if (Number.isFinite(parsedVoiceRatio)) {
      this.targetProfileVoiceRatio = clamp01(parsedVoiceRatio)
    }
    if (Number.isFinite(parsedZcr)) {
      this.targetProfileZcr = clamp01(parsedZcr)
    }
    if (Number.isFinite(parsedSnrScore)) {
      this.targetProfileSnrScore = clamp01(parsedSnrScore)
    }
    if (Number.isFinite(parsedConfidence)) {
      this.targetProfileConfidence = clamp(parsedConfidence, 0, 1)
    }
    if (Number.isFinite(parsedSensitivity)) {
      this.config.targetLockSensitivity = clamp(parsedSensitivity, 0, 1)
    }
    this.targetProfileFrozen = Boolean(profile.targetProfileFrozen)
    this.targetStableBlocks = this.targetProfileFrozen ? 24 : 0
    this.targetMismatchBlocks = 0
    this.targetCalibrationFramesRemaining = 0
    this.targetCalibrationFramesTotal = 0
  }

  getTargetCalibrationProgress() {
    if (this.targetProfileFrozen) return 1
    const confidenceProgress = scoreRange(this.targetProfileConfidence, 0.12, 0.76)
    const stableProgress = clamp01(this.targetStableBlocks / 24)
    if (this.targetCalibrationFramesTotal <= 0) {
      return clamp01(confidenceProgress * 0.8 + stableProgress * 0.2)
    }
    const elapsedFrames = this.targetCalibrationFramesTotal - this.targetCalibrationFramesRemaining
    const elapsedProgress = clamp01(elapsedFrames / this.targetCalibrationFramesTotal)
    return clamp01(Math.max(elapsedProgress * 0.65, confidenceProgress * 0.8 + stableProgress * 0.2))
  }

  setRuntime(mode) {
    this.runtimeMode = normalizeRuntimeMode(mode)
    this.runtime = this.runtimeMode === "neural_stub" ? new NeuralStubNearFieldRuntime() : new HeuristicNearFieldRuntime()
  }

  applyConfig(next) {
    const config = next || {}
    const previousTargetSpeakerLock = this.config.targetSpeakerLock
    this.config.strength = clamp(Number(config.strength) || DEFAULT_CONFIG.strength, 0.2, 1)
    this.config.minSuppressionGain = clamp(
      Number(config.minSuppressionGain) || DEFAULT_CONFIG.minSuppressionGain,
      0.02,
      0.7,
    )
    this.config.nearFieldBias = clamp(Number(config.nearFieldBias) || DEFAULT_CONFIG.nearFieldBias, 0.2, 0.8)
    this.config.presenceBoost = clamp(Number(config.presenceBoost) || DEFAULT_CONFIG.presenceBoost, 0, 0.6)
    this.config.rumbleDamp = clamp(Number(config.rumbleDamp) || DEFAULT_CONFIG.rumbleDamp, 0, 0.7)
    this.config.targetSpeakerLock = Boolean(config.targetSpeakerLock)
    const parsedTargetLockSensitivity = Number(config.targetLockSensitivity)
    this.config.targetLockSensitivity = clamp(
      Number.isFinite(parsedTargetLockSensitivity) ? parsedTargetLockSensitivity : DEFAULT_CONFIG.targetLockSensitivity,
      0,
      1,
    )
    if (this.config.targetSpeakerLock && !previousTargetSpeakerLock) {
      this.resetTargetProfile()
      this.startTargetCalibration(6500)
    } else if (!this.config.targetSpeakerLock) {
      this.targetProfileFrozen = false
      this.targetStableBlocks = 0
      this.targetMismatchBlocks = 0
      this.targetCalibrationFramesRemaining = 0
      this.targetCalibrationFramesTotal = 0
    }

    const nextRuntimeMode = normalizeRuntimeMode(config.runtimeMode || this.runtimeMode)
    if (nextRuntimeMode !== this.runtimeMode) {
      this.setRuntime(nextRuntimeMode)
    }

    this.updateFilterCoefficients()
  }

  updateFilterCoefficients() {
    const dt = 1 / sampleRate
    const highpassHz = 100
    const speechLowpassHz = 3600
    const rumbleLowpassHz = 170

    const hpRc = 1 / (2 * Math.PI * highpassHz)
    this.hpAlpha = hpRc / (hpRc + dt)

    const speechRc = 1 / (2 * Math.PI * speechLowpassHz)
    this.speechLpAlpha = dt / (speechRc + dt)

    const rumbleRc = 1 / (2 * Math.PI * rumbleLowpassHz)
    this.rumbleLpAlpha = dt / (rumbleRc + dt)
  }

  ensureScratchSize(size) {
    if (this.hpScratch.length >= size) return
    this.hpScratch = new Float32Array(size)
    this.speechScratch = new Float32Array(size)
    this.rumbleScratch = new Float32Array(size)
  }

  applyTargetSpeakerLock(features, nearFieldScore, speechLikelihood) {
    const calibrationActive = this.targetCalibrationFramesRemaining > 0
    if (calibrationActive) {
      this.targetCalibrationFramesRemaining = Math.max(0, this.targetCalibrationFramesRemaining - 1)
    }

    if (!this.config.targetSpeakerLock) {
      this.targetProfileConfidence = Math.max(0, this.targetProfileConfidence - 0.012)
      this.targetMatchScore = this.targetMatchScore * 0.9
      this.targetProfileFrozen = false
      this.targetStableBlocks = 0
      this.targetMismatchBlocks = 0
      return nearFieldScore
    }

    const lockSensitivity = clamp01(this.config.targetLockSensitivity)
    const calibrationLearnBoost = calibrationActive ? 0.08 : 0
    const learnNearFieldThreshold = 0.66 - lockSensitivity * 0.14 - calibrationLearnBoost
    const learnSpeechThreshold = 0.6 - lockSensitivity * 0.12 - calibrationLearnBoost
    const learnOnsetThreshold = 0.2 - lockSensitivity * 0.1 - calibrationLearnBoost * 0.5

    const hasLearningSignal =
      nearFieldScore >= learnNearFieldThreshold &&
      speechLikelihood >= learnSpeechThreshold &&
      features.onsetScore >= learnOnsetThreshold
    if (hasLearningSignal && !this.targetProfileFrozen) {
      const learnAlpha = this.targetProfileConfidence < 0.45 ? 0.18 + (calibrationActive ? 0.06 : 0) : 0.08 + (calibrationActive ? 0.03 : 0)
      this.targetProfileVoiceRatio =
        this.targetProfileVoiceRatio * (1 - learnAlpha) + features.voiceRatio * learnAlpha
      this.targetProfileZcr = this.targetProfileZcr * (1 - learnAlpha) + features.zcr * learnAlpha
      this.targetProfileSnrScore = this.targetProfileSnrScore * (1 - learnAlpha) + features.snrScore * learnAlpha
      this.targetProfileConfidence = Math.min(1, this.targetProfileConfidence + (calibrationActive ? 0.066 : 0.045))
    } else if (!this.targetProfileFrozen) {
      this.targetProfileConfidence = Math.max(0, this.targetProfileConfidence - (calibrationActive ? 0.006 : 0.01))
    } else if (!hasLearningSignal) {
      this.targetProfileConfidence = Math.max(0.24, this.targetProfileConfidence - 0.0035)
    }

    if (this.targetProfileConfidence < 0.12) {
      this.targetMatchScore = this.targetProfileConfidence * 2
      this.targetProfileFrozen = false
      this.targetStableBlocks = 0
      this.targetMismatchBlocks = 0
      return nearFieldScore
    }

    const ratioMatch = 1 - Math.abs(features.voiceRatio - this.targetProfileVoiceRatio) / 0.45
    const zcrMatch = 1 - Math.abs(features.zcr - this.targetProfileZcr) / 0.2
    const snrMatch = 1 - Math.abs(features.snrScore - this.targetProfileSnrScore) / 0.85

    const targetMatch = clamp01(0.45 * ratioMatch + 0.25 * zcrMatch + 0.3 * snrMatch)
    this.targetMatchScore = this.targetMatchScore * 0.72 + targetMatch * 0.28

    const speechLockCandidate = speechLikelihood >= 0.54 && nearFieldScore >= 0.52
    const stableMatchThreshold = 0.82 - lockSensitivity * 0.18 - (calibrationActive ? 0.06 : 0)
    if (speechLockCandidate && this.targetMatchScore >= stableMatchThreshold) {
      this.targetStableBlocks = Math.min(120, this.targetStableBlocks + 1)
    } else {
      this.targetStableBlocks = Math.max(0, this.targetStableBlocks - 2)
    }

    const stableBlocksThreshold = Math.round(34 - lockSensitivity * 18 - (calibrationActive ? 8 : 0))
    if (!this.targetProfileFrozen && this.targetProfileConfidence >= 0.72 && this.targetStableBlocks >= stableBlocksThreshold) {
      this.targetProfileFrozen = true
      this.targetMismatchBlocks = 0
      this.targetCalibrationFramesRemaining = 0
    }

    const mismatchThreshold = 0.22 + (1 - lockSensitivity) * 0.16
    if (this.targetProfileFrozen && speechLockCandidate && this.targetMatchScore < mismatchThreshold) {
      this.targetMismatchBlocks = Math.min(120, this.targetMismatchBlocks + 1)
    } else {
      this.targetMismatchBlocks = Math.max(0, this.targetMismatchBlocks - 1)
    }

    const mismatchBlocksThreshold = Math.round(12 + (1 - lockSensitivity) * 10)
    if (this.targetProfileFrozen && this.targetMismatchBlocks >= mismatchBlocksThreshold) {
      this.targetProfileFrozen = false
      this.targetStableBlocks = 0
      this.targetMismatchBlocks = 0
      this.targetProfileConfidence = Math.max(0.28, this.targetProfileConfidence * 0.72)
    }

    const confidenceWeight = scoreRange(this.targetProfileConfidence, 0.12, 0.76)
    const lockWeightBase = this.targetProfileFrozen ? 0.36 + 0.12 * lockSensitivity : 0.28 + 0.1 * lockSensitivity
    const lockWeight = lockWeightBase * confidenceWeight
    const effectiveMatchScore = this.targetProfileFrozen
      ? this.targetMatchScore
      : clamp01(this.targetMatchScore * 0.92 + confidenceWeight * 0.08)
    return clamp01(nearFieldScore * (1 - lockWeight + effectiveMatchScore * lockWeight))
  }

  process(inputs, outputs) {
    const outputChannels = outputs[0]
    if (!outputChannels || outputChannels.length === 0) return true

    const inputChannels = inputs[0]
    const input = inputChannels && inputChannels[0] ? inputChannels[0] : null

    if (!input) {
      for (let ch = 0; ch < outputChannels.length; ch += 1) {
        outputChannels[ch].fill(0)
      }
      return true
    }

    const frameSize = input.length
    const useRustCore = this.runtimeMode === "rust_wasm" && this.rustCore && this.rustCore.ready
    let rms = 0
    let voiceRatio = 0
    let rumbleRatio = 0
    let zcr = 0
    let hasRustMetrics = false

    if (useRustCore) {
      try {
        const rustMetrics = this.rustCore.analyze(input, frameSize)
        if (rustMetrics) {
          rms = rustMetrics.rms
          voiceRatio = rustMetrics.voiceRatio
          rumbleRatio = rustMetrics.rumbleRatio
          zcr = rustMetrics.zcr
          hasRustMetrics = true
        } else {
          this.rustFallbackNotified = true
        }
      } catch {
        this.rustCore = null
        hasRustMetrics = false
      }
    }

    if (!useRustCore || !hasRustMetrics) {
      this.ensureScratchSize(frameSize)

      let sumSquares = 0
      let totalEnergy = 1e-7
      let voiceEnergy = 0
      let rumbleEnergy = 0
      let zeroCrossings = 0
      let lastSign = this.lastSign

      for (let i = 0; i < frameSize; i += 1) {
        const sample = input[i]

        const highpassed = this.hpAlpha * (this.hpPrevOutput + sample - this.hpPrevInput)
        this.hpPrevInput = sample
        this.hpPrevOutput = highpassed

        this.lpSpeech += this.speechLpAlpha * (highpassed - this.lpSpeech)
        this.lpRumble += this.rumbleLpAlpha * (sample - this.lpRumble)

        const speechBand = this.lpSpeech
        const rumbleBand = this.lpRumble

        this.hpScratch[i] = highpassed
        this.speechScratch[i] = speechBand
        this.rumbleScratch[i] = rumbleBand

        const hpEnergy = highpassed * highpassed
        sumSquares += hpEnergy
        totalEnergy += hpEnergy
        voiceEnergy += speechBand * speechBand
        rumbleEnergy += rumbleBand * rumbleBand

        const sign = highpassed > 0.0025 ? 1 : highpassed < -0.0025 ? -1 : 0
        if (i > 0 && sign !== 0 && lastSign !== 0 && sign !== lastSign) {
          zeroCrossings += 1
        }
        if (sign !== 0) {
          lastSign = sign
        }
      }

      this.lastSign = lastSign

      rms = Math.sqrt(sumSquares / frameSize)
      voiceRatio = voiceEnergy / totalEnergy
      rumbleRatio = rumbleEnergy / totalEnergy
      zcr = zeroCrossings / frameSize
    }

    const previousRms = this.smoothedRms
    this.smoothedRms = this.smoothedRms * 0.78 + rms * 0.22
    this.smoothedVoiceRatio = this.smoothedVoiceRatio * 0.82 + voiceRatio * 0.18
    this.smoothedRumbleRatio = this.smoothedRumbleRatio * 0.82 + rumbleRatio * 0.18
    const rmsRise = this.smoothedRms - previousRms
    this.smoothedRise = this.smoothedRise * 0.72 + rmsRise * 0.28

    const snr = this.smoothedRms / Math.max(1e-5, this.noiseFloor)
    if (!this.isSpeaking || snr < 1.35) {
      this.noiseFloor = this.noiseFloor * 0.968 + this.smoothedRms * 0.032
    } else {
      this.noiseFloor = this.noiseFloor * 0.994 + this.smoothedRms * 0.006
    }
    this.noiseFloor = clamp(this.noiseFloor, 0.0008, 0.08)

    const features = {
      snr,
      snrScore: scoreRange(snr, 1.12, 3.7),
      voiceRatio,
      voiceRatioScore: scoreRange(this.smoothedVoiceRatio, 0.22, 0.76),
      rumblePenalty: scoreRange(this.smoothedRumbleRatio, 0.2, 0.6),
      onsetScore: scoreRange(this.smoothedRise, 0.00035, 0.0032),
      zcr,
      zcrPenalty: scoreRange(Math.abs(zcr - 0.1), 0.11, 0.34),
    }

    const runtimeOutput = this.runtime.infer(features, this.config)
    const speechLikelihood = clamp01(runtimeOutput.speechLikelihood)
    let nearFieldScore = clamp01(runtimeOutput.nearFieldScore)
    nearFieldScore = this.applyTargetSpeakerLock(features, nearFieldScore, speechLikelihood)

    this.smoothedNearFieldScore = this.smoothedNearFieldScore * 0.74 + nearFieldScore * 0.26

    const openThreshold = 0.5 - this.config.strength * 0.08 - (this.config.targetSpeakerLock ? 0.02 : 0)
    const closeThreshold = 0.2 + this.config.strength * 0.04
    if (this.smoothedNearFieldScore >= openThreshold) {
      this.isSpeaking = true
      this.speakingHoldBlocks = 8
    } else if (this.isSpeaking) {
      if (this.speakingHoldBlocks > 0) {
        this.speakingHoldBlocks -= 1
      } else if (this.smoothedNearFieldScore < closeThreshold) {
        this.isSpeaking = false
      }
    }

    const onsetSpeechCandidate =
      !this.isSpeaking &&
      features.onsetScore >= 0.4 &&
      speechLikelihood >= 0.4 &&
      nearFieldScore >= openThreshold * 0.68 &&
      snr >= 1.1
    const softSpeechRescueCandidate =
      !this.isSpeaking &&
      speechLikelihood >= 0.42 &&
      features.onsetScore >= 0.22 &&
      features.voiceRatioScore >= 0.28 &&
      snr >= 1.18
    if (this.isSpeaking) {
      this.speechAttackBlocks = Math.max(this.speechAttackBlocks, 4)
    } else if (onsetSpeechCandidate) {
      this.speechAttackBlocks = 12
    } else if (softSpeechRescueCandidate) {
      this.speechAttackBlocks = Math.max(this.speechAttackBlocks, 9)
      if (this.smoothedNearFieldScore >= openThreshold * 0.78) {
        this.isSpeaking = true
        this.speakingHoldBlocks = Math.max(this.speakingHoldBlocks, 6)
      }
    } else if (this.speechAttackBlocks > 0) {
      this.speechAttackBlocks -= 1
    }

    const gainCurveExp = 0.62 - this.config.strength * 0.2
    let targetGain =
      this.config.minSuppressionGain +
      (1 - this.config.minSuppressionGain) * Math.pow(this.smoothedNearFieldScore, clamp(gainCurveExp, 0.28, 0.84))

    if (this.config.targetSpeakerLock && this.targetProfileConfidence > 0.2) {
      const sensitivity = clamp01(this.config.targetLockSensitivity)
      const lockGainFloor = this.targetProfileFrozen
        ? 0.58 + (1 - sensitivity) * 0.1
        : 0.68 + (1 - sensitivity) * 0.08
      targetGain *= lockGainFloor + (1 - lockGainFloor) * this.targetMatchScore
      const lockSoftSpeechRescue =
        speechLikelihood >= 0.48 &&
        (features.onsetScore >= 0.24 || this.isSpeaking || this.speechAttackBlocks > 0) &&
        snr >= 1.16
      if (lockSoftSpeechRescue) {
        const rescueFloor = clamp(0.62 + 0.24 * speechLikelihood + 0.08 * features.onsetScore, 0.62, 0.9)
        targetGain = Math.max(targetGain, rescueFloor)
      }
    }

    if (this.isSpeaking) {
      targetGain = Math.max(targetGain, 0.9)
    } else if (features.onsetScore > 0.5 && speechLikelihood > 0.44) {
      targetGain = Math.max(targetGain, 0.76)
    }
    if (!this.isSpeaking && speechLikelihood >= 0.5 && features.voiceRatioScore >= 0.3 && snr >= 1.18) {
      targetGain = Math.max(targetGain, clamp(0.66 + 0.2 * speechLikelihood, 0.66, 0.86))
    }
    if (this.speechAttackBlocks > 0) {
      const onsetFloor = 0.82 + 0.14 * speechLikelihood
      targetGain = Math.max(targetGain, onsetFloor)
    }

    const gainAttack = this.isSpeaking ? 0.44 : this.speechAttackBlocks > 0 ? 0.34 : 0.16
    const gainRelease = this.isSpeaking ? 0.07 : this.speechAttackBlocks > 0 ? 0.12 : 0.2
    const gainBlend = targetGain >= this.suppressionGain ? gainAttack : gainRelease
    this.suppressionGain = this.suppressionGain * (1 - gainBlend) + targetGain * gainBlend

    const rumbleReduction = this.config.rumbleDamp * (1 - this.smoothedNearFieldScore)
    const presenceLift = this.config.presenceBoost * this.smoothedNearFieldScore
    const saturationDrive = 1 + this.config.strength * 0.45

    const firstOutput = outputChannels[0]
    let renderedByRust = false
    if (useRustCore && this.rustCore?.ready) {
      try {
        renderedByRust = this.rustCore.render(
          firstOutput,
          frameSize,
          this.suppressionGain,
          presenceLift,
          rumbleReduction,
          saturationDrive,
        )
      } catch {
        this.rustCore = null
        renderedByRust = false
      }
    }
    if (!renderedByRust) {
      const saturationNormalizer = Math.tanh(saturationDrive)
      for (let i = 0; i < frameSize; i += 1) {
        let y = this.hpScratch[i]
        y += this.speechScratch[i] * presenceLift
        y -= this.rumbleScratch[i] * rumbleReduction
        y *= this.suppressionGain
        y = Math.tanh(y * saturationDrive) / saturationNormalizer
        firstOutput[i] = y
      }
    }

    for (let ch = 1; ch < outputChannels.length; ch += 1) {
      outputChannels[ch].set(firstOutput)
    }

    this.blockCount += 1
    if (this.blockCount % this.metricsInterval === 0) {
      this.port.postMessage({
        type: "metrics",
        nearFieldScore: this.smoothedNearFieldScore,
        suppressionGain: this.suppressionGain,
        noiseFloor: this.noiseFloor,
        speechLikelihood,
        targetMatchScore: this.targetMatchScore,
        targetProfileConfidence: this.targetProfileConfidence,
        targetProfileFrozen: this.targetProfileFrozen,
        targetProfileVoiceRatio: this.targetProfileVoiceRatio,
        targetProfileZcr: this.targetProfileZcr,
        targetProfileSnrScore: this.targetProfileSnrScore,
        targetLockSensitivity: this.config.targetLockSensitivity,
        targetCalibrationActive: this.targetCalibrationFramesRemaining > 0,
        targetCalibrationProgress: this.getTargetCalibrationProgress(),
        runtimeMode: this.runtimeMode,
      })
    }

    return true
  }
}

registerProcessor("voice-engine-processor", VoiceEngineProcessor)
