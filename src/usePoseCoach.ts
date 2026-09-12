import { useCallback, useEffect, useRef, useState } from 'react'
import type { Keypoint, PoseDetector } from '@tensorflow-models/pose-detection'

export type Exercise = 'Squat' | 'Curl' | 'Press'
export type CameraStatus = 'idle' | 'requesting' | 'loading-model' | 'active' | 'error'

export interface CoachMetrics {
  reps: number
  set: number
  score: number | null
  angle: number | null
  cue: string
  status: CameraStatus
  error: string | null
}

const CONNECTIONS: Array<[string, string]> = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
]

const BASE_CUES: Record<Exercise, string> = {
  Squat: 'Stand tall in frame. Feet just outside hip width.',
  Curl: 'Keep your elbows close and shoulders relaxed.',
  Press: 'Stack wrists over elbows and brace your core.',
}

const REP_TARGETS: Record<Exercise, number> = {
  Squat: 10,
  Curl: 12,
  Press: 8,
}

const CONFIDENCE = 0.32

type Point = { x: number; y: number; score?: number }

type Phase = 'ready' | 'loaded'

function getPoint(points: Keypoint[], name: string): Point | null {
  const point = points.find((item) => item.name === name)
  if (!point || (point.score ?? 0) < CONFIDENCE) return null
  return point
}

function jointAngle(a: Point, b: Point, c: Point) {
  const ab = Math.atan2(a.y - b.y, a.x - b.x)
  const cb = Math.atan2(c.y - b.y, c.x - b.x)
  let angle = Math.abs((ab - cb) * (180 / Math.PI))
  if (angle > 180) angle = 360 - angle
  return angle
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null)
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null
}

function getExerciseAngle(points: Keypoint[], exercise: Exercise) {
  if (exercise === 'Squat') {
    return average(['left', 'right'].map((side) => {
      const hip = getPoint(points, `${side}_hip`)
      const knee = getPoint(points, `${side}_knee`)
      const ankle = getPoint(points, `${side}_ankle`)
      return hip && knee && ankle ? jointAngle(hip, knee, ankle) : null
    }))
  }

  return average(['left', 'right'].map((side) => {
    const shoulder = getPoint(points, `${side}_shoulder`)
    const elbow = getPoint(points, `${side}_elbow`)
    const wrist = getPoint(points, `${side}_wrist`)
    return shoulder && elbow && wrist ? jointAngle(shoulder, elbow, wrist) : null
  }))
}

function midpoint(a: Point, b: Point) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function analyzeForm(points: Keypoint[], exercise: Exercise, angle: number) {
  let cue = BASE_CUES[exercise]
  let score = 96

  const leftShoulder = getPoint(points, 'left_shoulder')
  const rightShoulder = getPoint(points, 'right_shoulder')
  const leftHip = getPoint(points, 'left_hip')
  const rightHip = getPoint(points, 'right_hip')

  if (leftShoulder && rightShoulder && leftHip && rightHip) {
    const shoulders = midpoint(leftShoulder, rightShoulder)
    const hips = midpoint(leftHip, rightHip)
    const torsoTilt = Math.abs(Math.atan2(shoulders.x - hips.x, hips.y - shoulders.y) * 180 / Math.PI)
    score -= Math.max(0, torsoTilt - 18) * 0.9
    if (torsoTilt > 35) cue = 'Lift your chest and keep your spine long.'
  }

  if (exercise === 'Squat') {
    const leftKnee = getPoint(points, 'left_knee')
    const rightKnee = getPoint(points, 'right_knee')
    const leftAnkle = getPoint(points, 'left_ankle')
    const rightAnkle = getPoint(points, 'right_ankle')
    if (leftKnee && rightKnee && leftAnkle && rightAnkle) {
      const stance = Math.max(40, Math.abs(leftAnkle.x - rightAnkle.x))
      const tracking = (Math.abs(leftKnee.x - leftAnkle.x) + Math.abs(rightKnee.x - rightAnkle.x)) / stance
      score -= Math.max(0, tracking - 0.22) * 42
      if (tracking > 0.42) cue = 'Keep your knees tracking over your toes.'
    }
    if (angle < 112 && cue === BASE_CUES.Squat) cue = 'Great depth — drive through your heels.'
    else if (angle < 152 && cue === BASE_CUES.Squat) cue = 'Lower your hips with control.'
  } else if (exercise === 'Curl') {
    if (angle < 72) cue = 'Strong curl. Lower slowly — keep elbows still.'
    else if (angle < 140) cue = 'Curl toward your shoulders without swinging.'
  } else {
    if (angle > 154) cue = 'Arms tall. Keep ribs down and breathe.'
    else if (angle > 100) cue = 'Press smoothly — keep wrists stacked.'
  }

  return { cue, score: Math.max(68, Math.min(100, Math.round(score))) }
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  points: Keypoint[],
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(200, 241, 105, .62)'
  ctx.shadowBlur = 13
  ctx.strokeStyle = '#c8f169'
  ctx.lineWidth = Math.max(3, width / 250)

  CONNECTIONS.forEach(([from, to]) => {
    const a = getPoint(points, from)
    const b = getPoint(points, to)
    if (!a || !b) return
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  })

  points.forEach((point) => {
    if ((point.score ?? 0) < CONFIDENCE || !point.name || point.name.includes('eye') || point.name.includes('ear')) return
    ctx.beginPath()
    ctx.fillStyle = '#dafa8f'
    const radius = Math.max(4.2, width / 185)
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(11, 13, 16, .72)'
    ctx.lineWidth = 2
    ctx.stroke()
  })
  ctx.shadowBlur = 0
}

export function usePoseCoach(exercise: Exercise, voiceEnabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<PoseDetector | null>(null)
  const frameRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const phaseRef = useRef<Phase>('ready')
  const repsRef = useRef(0)
  const scoreRef = useRef<number | null>(null)
  const lastUiUpdateRef = useRef(0)
  const lastSpokenRef = useRef({ cue: '', at: 0 })
  const exerciseRef = useRef(exercise)
  const voiceRef = useRef(voiceEnabled)
  const [metrics, setMetrics] = useState<CoachMetrics>({
    reps: 0,
    set: 1,
    score: null,
    angle: null,
    cue: BASE_CUES[exercise],
    status: 'idle',
    error: null,
  })

  useEffect(() => {
    exerciseRef.current = exercise
    phaseRef.current = 'ready'
    repsRef.current = 0
    scoreRef.current = null
    setMetrics((current) => ({
      ...current,
      reps: 0,
      set: 1,
      score: null,
      angle: null,
      cue: BASE_CUES[exercise],
    }))
  }, [exercise])

  useEffect(() => {
    voiceRef.current = voiceEnabled
    if (!voiceEnabled) window.speechSynthesis?.cancel()
  }, [voiceEnabled])

  const speakCue = useCallback((cue: string) => {
    if (!voiceRef.current || !('speechSynthesis' in window)) return
    const now = Date.now()
    const previous = lastSpokenRef.current
    if (previous.cue === cue || now - previous.at < 4200) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(cue)
    utterance.rate = 0.93
    utterance.pitch = 1
    utterance.volume = 0.8
    window.speechSynthesis.speak(utterance)
    lastSpokenRef.current = { cue, at: now }
  }, [])

  const updatePhase = useCallback((angle: number, activeExercise: Exercise) => {
    let completedRep = false
    if (activeExercise === 'Squat') {
      if (phaseRef.current === 'ready' && angle < 108) phaseRef.current = 'loaded'
      else if (phaseRef.current === 'loaded' && angle > 154) completedRep = true
    } else if (activeExercise === 'Curl') {
      if (phaseRef.current === 'ready' && angle < 68) phaseRef.current = 'loaded'
      else if (phaseRef.current === 'loaded' && angle > 146) completedRep = true
    } else {
      if (phaseRef.current === 'ready' && angle < 104) phaseRef.current = 'loaded'
      else if (phaseRef.current === 'loaded' && angle > 154) completedRep = true
    }

    if (completedRep) {
      repsRef.current += 1
      phaseRef.current = 'ready'
      speakCue('Smooth rep. Keep that control.')
    }
  }, [speakCue])

  const stopCamera = useCallback(() => {
    runningRef.current = false
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    detectorRef.current?.dispose()
    detectorRef.current = null
    window.speechSynthesis?.cancel()
    if (videoRef.current) videoRef.current.srcObject = null
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setMetrics((current) => ({ ...current, status: 'idle', error: null }))
  }, [])

  const runDetection = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const detector = detectorRef.current
    if (!runningRef.current || !video || !canvas || !detector) return

    if (video.readyState >= 2) {
      try {
        const poses = await detector.estimatePoses(video, { flipHorizontal: false })
        if (!runningRef.current) return
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
        const ctx = canvas.getContext('2d')
        const pose = poses[0]
        if (ctx && pose) {
          drawSkeleton(ctx, pose.keypoints, canvas.width, canvas.height)
          const angle = getExerciseAngle(pose.keypoints, exerciseRef.current)
          if (angle !== null) {
            updatePhase(angle, exerciseRef.current)
            const analysis = analyzeForm(pose.keypoints, exerciseRef.current, angle)
            scoreRef.current = scoreRef.current === null
              ? analysis.score
              : Math.round(scoreRef.current * 0.82 + analysis.score * 0.18)
            const now = performance.now()
            if (now - lastUiUpdateRef.current > 110) {
              lastUiUpdateRef.current = now
              setMetrics((current) => ({
                ...current,
                reps: repsRef.current,
                set: repsRef.current === 0
                  ? 1
                  : Math.floor((repsRef.current - 1) / REP_TARGETS[exerciseRef.current]) + 1,
                score: scoreRef.current,
                angle: Math.round(angle),
                cue: analysis.cue,
              }))
              if (analysis.score < 83) speakCue(analysis.cue)
            }
          }
        } else if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          setMetrics((current) => ({ ...current, cue: 'Step back so your full body is visible.' }))
        }
      } catch (error) {
        console.warn('Pose frame skipped:', error)
      }
    }
    if (runningRef.current) frameRef.current = requestAnimationFrame(runDetection)
  }, [speakCue, updatePhase])

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMetrics((current) => ({
        ...current,
        status: 'error',
        error: 'Camera access is not supported in this browser.',
      }))
      return
    }

    setMetrics((current) => ({ ...current, status: 'requesting', error: null, cue: 'Requesting camera access…' }))
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) throw new Error('Camera view is unavailable.')
      video.srcObject = stream
      await video.play()

      setMetrics((current) => ({ ...current, status: 'loading-model', cue: 'Loading your private on-device coach…' }))
      const tf = await import('@tensorflow/tfjs-core')
      await import('@tensorflow/tfjs-backend-webgl')
      const poseDetection = await import('@tensorflow-models/pose-detection')
      await tf.setBackend('webgl')
      await tf.ready()
      detectorRef.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING, enableSmoothing: true },
      )

      runningRef.current = true
      setMetrics((current) => ({ ...current, status: 'active', cue: BASE_CUES[exerciseRef.current] }))
      frameRef.current = requestAnimationFrame(runDetection)
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      const message = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Camera permission was blocked. Allow access in your browser settings and try again.'
        : error instanceof Error ? error.message : 'We could not start your camera.'
      setMetrics((current) => ({ ...current, status: 'error', error: message, cue: BASE_CUES[exerciseRef.current] }))
    }
  }, [runDetection])

  useEffect(() => () => {
    runningRef.current = false
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    detectorRef.current?.dispose()
    window.speechSynthesis?.cancel()
  }, [])

  return { videoRef, canvasRef, metrics, startCamera, stopCamera }
}
