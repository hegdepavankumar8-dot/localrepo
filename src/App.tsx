import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  Gauge,
  Maximize,
  MoreHorizontal,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Timer,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { ReferenceGuide } from './ReferenceGuide'
import { type Exercise, usePoseCoach } from './usePoseCoach'
import './styles.css'

const exercises: Array<{
  name: Exercise
  detail: string
  sets: string
  targetReps: number
  target: string
}> = [
  { name: 'Squat', detail: 'Bodyweight', sets: '3 × 10', targetReps: 10, target: 'Quads · Glutes' },
  { name: 'Curl', detail: 'Standing', sets: '3 × 12', targetReps: 12, target: 'Biceps · Forearms' },
  { name: 'Press', detail: 'Overhead', sets: '3 × 8', targetReps: 8, target: 'Shoulders · Triceps' },
]

function formatTime(total: number) {
  const minutes = Math.floor(total / 60).toString().padStart(2, '0')
  const seconds = (total % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function FormaMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i className="brand-mark__joint brand-mark__joint--a" />
      <i className="brand-mark__joint brand-mark__joint--b" />
      <i className="brand-mark__joint brand-mark__joint--c" />
      <i className="brand-mark__joint brand-mark__joint--d" />
    </span>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? 'toggle--on' : ''}`}
      onClick={onChange}
    >
      <span />
    </button>
  )
}

export default function App() {
  const [exercise, setExercise] = useState<Exercise>('Squat')
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [guideEnabled, setGuideEnabled] = useState(true)
  const [largeText, setLargeText] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const cameraStageRef = useRef<HTMLDivElement>(null)
  const { videoRef, canvasRef, metrics, startCamera, stopCamera } = usePoseCoach(exercise, voiceEnabled)
  const currentExercise = useMemo(() => exercises.find((item) => item.name === exercise)!, [exercise])
  const cameraOn = metrics.status === 'active'
  const cameraStarting = metrics.status === 'requesting' || metrics.status === 'loading-model'
  const repsInSet = metrics.reps === 0 ? 0 : ((metrics.reps - 1) % currentExercise.targetReps) + 1

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText)
    return () => document.documentElement.classList.remove('large-text')
  }, [largeText])

  useEffect(() => {
    if (!cameraOn) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [cameraOn])

  const chooseExercise = (next: Exercise) => {
    if (next === exercise) return
    setExercise(next)
  }

  const finishSession = () => {
    if (cameraOn) stopCamera()
    setSummaryOpen(true)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="Forma home">
          <FormaMark />
          <span>forma</span>
        </a>
        <div className="topbar__session">
          <span className={`session-dot ${cameraOn ? 'session-dot--live' : ''}`} />
          <span>Live coaching</span>
          <i />
          <span className="timer-label"><Timer size={15} /> {formatTime(elapsed)}</span>
        </div>
        <nav className="topbar__actions" aria-label="Session actions">
          <button className="icon-button help-button" type="button" aria-label="Open coaching help">
            <CircleHelp size={20} />
          </button>
          <button className="finish-button" type="button" onClick={finishSession}>
            Finish session
          </button>
          <button className="icon-button mobile-more" type="button" aria-label="More actions">
            <MoreHorizontal size={20} />
          </button>
        </nav>
      </header>

      <main id="main" className="main-content">
        <section className="session-heading" aria-labelledby="session-title">
          <div>
            <a href="#" className="back-link"><ArrowLeft size={15} /> Today’s plan</a>
            <h1 id="session-title">Move <em>well,</em> feel stronger.</h1>
            <p>Your coach watches the angles. You stay focused on the movement.</p>
          </div>
          <div className="privacy-badge">
            <span className="privacy-badge__icon"><ShieldCheck size={18} /></span>
            <span><strong>Private by design</strong><small>Video stays on this device</small></span>
          </div>
        </section>

        <div className="exercise-switcher" role="tablist" aria-label="Choose an exercise">
          {exercises.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={exercise === item.name}
              className={exercise === item.name ? 'active' : ''}
              onClick={() => chooseExercise(item.name)}
              key={item.name}
            >
              {exercise === item.name && <span className="tab-live-dot" />}
              {item.name}
              <small>{item.detail}</small>
            </button>
          ))}
        </div>

        <div className="workout-layout">
          <section className="camera-column" aria-label="Live camera coaching">
            <div ref={cameraStageRef} className={`camera-stage camera-stage--${metrics.status}`}>
              <video ref={videoRef} className="camera-feed" muted playsInline aria-label="Your live camera feed" />
              <canvas ref={canvasRef} className="pose-canvas" aria-hidden="true" />
              <div className="camera-vignette" aria-hidden="true" />
              <div className="camera-grid" aria-hidden="true" />

              {!cameraOn && !cameraStarting && guideEnabled && (
                <div className="demo-guide" aria-hidden="true">
                  <div className="demo-guide__glow" />
                  <ReferenceGuide exercise={exercise} compact />
                </div>
              )}

              {cameraOn && guideEnabled && (
                <ReferenceGuide exercise={exercise} />
              )}

              <div className="engine-chip glass-dark">
                <span className={cameraOn ? 'is-live' : ''} />
                {cameraOn ? 'Tracking live' : 'MoveNet engine'}
                <small>On-device</small>
              </div>

              <div className="floating-stat floating-stat--rep glass-dark">
                <span>Rep</span>
                <strong>{metrics.reps.toString().padStart(2, '0')}</strong>
                <small>Set {metrics.set}</small>
              </div>

              <div className="floating-stat floating-stat--score glass-dark">
                <span>Form score</span>
                <strong>{metrics.score ?? '—'}<small>/100</small></strong>
                <div className="score-line"><i style={{ width: `${metrics.score ?? 0}%` }} /></div>
              </div>

              {metrics.status === 'idle' && (
                <div className="camera-onboarding">
                  <span className="eyebrow"><Sparkles size={14} /> Your space is ready</span>
                  <h2>Let’s check your <em>form.</em></h2>
                  <p>Place your full body in frame. Forma will add a live joint guide once your camera starts.</p>
                  <button type="button" className="primary-button" onClick={startCamera}>
                    <Camera size={18} /> Start camera
                  </button>
                  <span className="local-note"><ShieldCheck size={13} /> Nothing is recorded or uploaded</span>
                </div>
              )}

              {cameraStarting && (
                <div className="loading-state glass-dark" role="status">
                  <span className="loader"><i /></span>
                  <strong>{metrics.status === 'requesting' ? 'Opening camera…' : 'Loading MoveNet…'}</strong>
                  <small>{metrics.status === 'requesting' ? 'Your browser may ask for permission' : 'The model runs entirely in this browser'}</small>
                </div>
              )}

              {metrics.status === 'error' && (
                <div className="error-state glass-dark" role="alert">
                  <span><CameraOff size={22} /></span>
                  <strong>Camera didn’t start</strong>
                  <p>{metrics.error}</p>
                  <button type="button" onClick={startCamera}><RotateCcw size={15} /> Try again</button>
                </div>
              )}

              <div className="frame-corners" aria-hidden="true"><i /><i /><i /><i /></div>

              <div className="camera-tools" aria-label="Camera controls">
                <button
                  type="button"
                  className="tool-button glass-dark"
                  aria-label="Open camera view full screen"
                  onClick={() => cameraStageRef.current?.requestFullscreen?.()}
                >
                  <Maximize size={17} />
                </button>
                {cameraOn && (
                  <button type="button" className="tool-button glass-dark" aria-label="Turn camera off" onClick={stopCamera}>
                    <CameraOff size={17} />
                  </button>
                )}
              </div>

              <div className="cue-banner glass-dark" aria-live="polite">
                <span className="cue-icon"><Activity size={18} /></span>
                <div><small>Live cue</small><strong>{metrics.cue}</strong></div>
                <span className={`cue-audio ${voiceEnabled ? 'cue-audio--on' : ''}`}>
                  {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </span>
              </div>
            </div>

            <div className="stat-row" aria-label="Live workout statistics">
              <div><span>Reps</span><strong>{metrics.reps.toString().padStart(2, '0')}</strong><small>this exercise</small></div>
              <div><span>Form score</span><strong>{metrics.score ?? '—'}<i>{metrics.score !== null ? '%' : ''}</i></strong><small>{metrics.score === null ? 'waiting to track' : metrics.score >= 90 ? 'excellent control' : 'keep it steady'}</small></div>
              <div><span>{exercise === 'Squat' ? 'Knee angle' : 'Elbow angle'}</span><strong>{metrics.angle ?? '—'}<i>{metrics.angle !== null ? '°' : ''}</i></strong><small>{metrics.angle === null ? 'not detected' : exercise === 'Squat' && metrics.angle < 112 ? 'depth reached' : 'live angle'}</small></div>
            </div>
          </section>

          <aside className="coach-sidebar" aria-label="Workout details and controls">
            <section className="side-card movement-card">
              <div className="side-card__heading">
                <span>Now coaching</span>
                <button type="button" className="mini-icon" aria-label="Exercise options"><MoreHorizontal size={18} /></button>
              </div>
              <div className="movement-title">
                <span className="movement-number">01</span>
                <div><h2>{currentExercise.name}</h2><p>{currentExercise.detail} · {currentExercise.target}</p></div>
              </div>
              <div className="goal-row">
                <div><small>Target</small><strong>{currentExercise.sets}</strong></div>
                <div><small>Rest</small><strong>45 sec</strong></div>
                <div><small>Tempo</small><strong>3—1—2</strong></div>
              </div>
              <div className="progress-label"><span>Set progress</span><strong>{repsInSet} / {currentExercise.targetReps} reps</strong></div>
              <div className="rep-progress" style={{ gridTemplateColumns: `repeat(${currentExercise.targetReps}, 1fr)` }} aria-label={`${repsInSet} of ${currentExercise.targetReps} reps`}>
                {Array.from({ length: currentExercise.targetReps }, (_, index) => <i className={index < repsInSet ? 'done' : ''} key={index} />)}
              </div>
            </section>

            <section className="side-card setup-card">
              <div className="side-card__heading">
                <span>Form setup</span>
                <Settings2 size={17} />
              </div>
              <ul className="form-checks">
                <li><span><Check size={14} /></span><div><strong>Feet in frame</strong><small>Keep space around your ankles</small></div></li>
                <li><span><Check size={14} /></span><div><strong>Face the camera</strong><small>Step back about 2 metres</small></div></li>
                <li><span><Check size={14} /></span><div><strong>Move naturally</strong><small>No wearables or equipment needed</small></div></li>
              </ul>
            </section>

            <section className="side-card preferences-card">
              <div className="preference-row">
                <span className="preference-icon"><Volume2 size={17} /></span>
                <div><strong>Voice cues</strong><small>Hear corrections out loud</small></div>
                <Toggle checked={voiceEnabled} onChange={() => setVoiceEnabled((value) => !value)} label="Voice cues" />
              </div>
              <div className="preference-row">
                <span className="preference-icon"><Eye size={17} /></span>
                <div><strong>Coach guide</strong><small>Show the reference rep</small></div>
                <Toggle checked={guideEnabled} onChange={() => setGuideEnabled((value) => !value)} label="Reference coach guide" />
              </div>
              <div className="preference-row">
                <span className="preference-icon"><Gauge size={17} /></span>
                <div><strong>Readable mode</strong><small>Larger, higher-contrast labels</small></div>
                <Toggle checked={largeText} onChange={() => setLargeText((value) => !value)} label="Readable high-contrast mode" />
              </div>
            </section>

            <button type="button" className="next-exercise" onClick={() => {
              const index = exercises.findIndex((item) => item.name === exercise)
              chooseExercise(exercises[(index + 1) % exercises.length].name)
            }}>
              <span><small>Up next</small><strong>{exercises[(exercises.findIndex((item) => item.name === exercise) + 1) % exercises.length].name}</strong></span>
              <ChevronRight size={19} />
            </button>
          </aside>
        </div>

        <div className="privacy-footer">
          <ShieldCheck size={15} />
          <span><strong>Your movement is yours.</strong> Frames are processed and discarded in your browser — never stored, never sent.</span>
          <a href="#privacy">How privacy works <ChevronRight size={13} /></a>
        </div>
      </main>

      {summaryOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSummaryOpen(false)}>
          <section className="summary-modal" role="dialog" aria-modal="true" aria-labelledby="summary-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close summary" onClick={() => setSummaryOpen(false)}><X size={19} /></button>
            <span className="summary-icon"><Check size={26} /></span>
            <span className="eyebrow">Your data stays on this device</span>
            <h2 id="summary-title">Nice work showing <em>up.</em></h2>
            <p>Every controlled rep builds confidence. Here’s what you completed today.</p>
            <div className="summary-stats">
              <div><span>Reps</span><strong>{metrics.reps}</strong></div>
              <div><span>Form</span><strong>{metrics.score ?? '—'}{metrics.score !== null && <small>%</small>}</strong></div>
              <div><span>Time</span><strong>{formatTime(elapsed)}</strong></div>
            </div>
            <button type="button" className="primary-button summary-action" onClick={() => setSummaryOpen(false)}>Back to session</button>
          </section>
        </div>
      )}
    </div>
  )
}
