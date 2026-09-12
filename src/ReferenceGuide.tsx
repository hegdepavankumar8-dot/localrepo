import { useEffect, useMemo, useState } from 'react'
import type { Exercise } from './usePoseCoach'

type GuidePointName =
  | 'head' | 'leftShoulder' | 'rightShoulder' | 'leftElbow' | 'rightElbow'
  | 'leftWrist' | 'rightWrist' | 'leftHip' | 'rightHip' | 'leftKnee'
  | 'rightKnee' | 'leftAnkle' | 'rightAnkle'

type GuideFrame = Record<GuidePointName, [number, number]>

const standing: GuideFrame = {
  head: [80, 25],
  leftShoulder: [55, 61], rightShoulder: [105, 61],
  leftElbow: [44, 100], rightElbow: [116, 100],
  leftWrist: [43, 138], rightWrist: [117, 138],
  leftHip: [65, 132], rightHip: [95, 132],
  leftKnee: [61, 180], rightKnee: [99, 180],
  leftAnkle: [57, 226], rightAnkle: [103, 226],
}

const squatBottom: GuideFrame = {
  head: [80, 51],
  leftShoulder: [57, 82], rightShoulder: [103, 82],
  leftElbow: [43, 105], rightElbow: [117, 105],
  leftWrist: [62, 120], rightWrist: [98, 120],
  leftHip: [61, 143], rightHip: [99, 143],
  leftKnee: [42, 174], rightKnee: [118, 174],
  leftAnkle: [48, 222], rightAnkle: [112, 222],
}

const curlTop: GuideFrame = {
  ...standing,
  leftElbow: [48, 102], rightElbow: [112, 102],
  leftWrist: [55, 72], rightWrist: [105, 72],
}

const pressStart: GuideFrame = {
  ...standing,
  leftElbow: [42, 91], rightElbow: [118, 91],
  leftWrist: [56, 68], rightWrist: [104, 68],
}

const pressTop: GuideFrame = {
  ...standing,
  leftElbow: [61, 49], rightElbow: [99, 49],
  leftWrist: [65, 15], rightWrist: [95, 15],
}

const tracks: Record<Exercise, GuideFrame[]> = {
  Squat: [standing, standing, squatBottom, squatBottom, standing],
  Curl: [standing, standing, curlTop, curlTop, standing],
  Press: [pressStart, pressStart, pressTop, pressTop, pressStart],
}

const links: Array<[GuidePointName, GuidePointName]> = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'], ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'],
]

function interpolateFrame(track: GuideFrame[], progress: number): GuideFrame {
  const segment = progress * (track.length - 1)
  const from = Math.floor(segment)
  const to = Math.min(track.length - 1, from + 1)
  const mix = segment - from
  return Object.fromEntries(Object.keys(track[0]).map((key) => {
    const name = key as GuidePointName
    const a = track[from][name]
    const b = track[to][name]
    return [name, [a[0] + (b[0] - a[0]) * mix, a[1] + (b[1] - a[1]) * mix]]
  })) as GuideFrame
}

interface ReferenceGuideProps {
  exercise: Exercise
  compact?: boolean
}

export function ReferenceGuide({ exercise, compact = false }: ReferenceGuideProps) {
  const [progress, setProgress] = useState(0)
  const track = useMemo(() => tracks[exercise], [exercise])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(0.52)
      return
    }
    let frame = 0
    let lastPaint = 0
    const startedAt = performance.now()
    const tick = (time: number) => {
      if (time - lastPaint > 42) {
        lastPaint = time
        setProgress(((time - startedAt) % 3400) / 3400)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [exercise])

  const pose = interpolateFrame(track, progress)

  return (
    <div className={`reference-guide ${compact ? 'reference-guide--compact' : ''}`} aria-label={`Looping reference ${exercise.toLowerCase()} form`}>
      <div className="reference-label"><span /> Coach form</div>
      <svg viewBox="0 0 160 242" role="img" aria-hidden="true">
        <g className="guide-skeleton-lines">
          {links.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={pose[a][0]} y1={pose[a][1]} x2={pose[b][0]} y2={pose[b][1]} />
          ))}
          <line x1={pose.head[0]} y1={pose.head[1] + 11} x2={(pose.leftShoulder[0] + pose.rightShoulder[0]) / 2} y2={pose.leftShoulder[1]} />
        </g>
        <circle className="guide-head" cx={pose.head[0]} cy={pose.head[1]} r="11" />
        <g className="guide-skeleton-joints">
          {(Object.entries(pose) as Array<[GuidePointName, [number, number]]>)
            .filter(([name]) => name !== 'head')
            .map(([name, point]) => <circle key={name} cx={point[0]} cy={point[1]} r="3.4" />)}
        </g>
      </svg>
    </div>
  )
}
