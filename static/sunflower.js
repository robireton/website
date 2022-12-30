class Sunflower {
  constructor (canvas, scale = 8) {
    const radius = Math.floor(0.94 * Math.min(canvas.width, canvas.height) / 2)
    this.φ_radians = Math.PI * (1 + Math.sqrt(5))
    this.canvas = canvas
    this.scale = scale
    this.limit = Math.floor(Math.pow(radius / scale, 2))
    this.step = 0
    this.ctx = canvas.getContext('2d')
  }

  get value () {
    return this.step / this.limit
  }

  set value (τ) {
    this.step = Math.max(0, Math.min(τ, 1)) * this.limit
    this.draw()
  }

  draw () {
    this.ctx.save()
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2)

    this.ctx.fillStyle = '#DBC364'
    this.ctx.strokeStyle = '#7C8635'
    this.ctx.lineWidth = this.scale
    this.ctx.beginPath()
    this.ctx.arc(0, 0, this.scale * (1 + Math.sqrt(this.step)), 0, 2 * Math.PI, false)
    this.ctx.fill()
    this.ctx.stroke()
    this.ctx.closePath()

    this.ctx.strokeStyle = '#241F20'
    this.ctx.fillStyle = '#F2EBCD'
    this.ctx.lineCap = 'square'

    for (let seed = 0; seed <= this.step; seed++) {
      this.place(seed, this.step)
    }
    this.ctx.restore()
  }

  place (seed, frame) {
    this.ctx.save()
    const ρ = this.scale * Math.sqrt(frame - seed)
    const size = this.scale + (this.scale / 2 * (frame - seed) / this.limit)

    this.ctx.lineWidth = size / 3
    this.ctx.rotate(seed * this.φ_radians)
    this.ctx.beginPath()
    this.ctx.moveTo(ρ - size / 2, 0)
    this.ctx.lineTo(ρ, size / 2)
    this.ctx.lineTo(ρ + size / 2, 0)
    this.ctx.lineTo(ρ, -size / 2)
    this.ctx.lineTo(ρ - size / 2, 0)
    this.ctx.fill()
    this.ctx.stroke()
    this.ctx.restore()
  }
}

const controlStep = document.getElementById('controlStep')
const controlPause = document.getElementById('controlPause')
const controlStart = document.getElementById('controlStart')
const controlBegin = document.getElementById('controlBegin')
const controlEnd = document.getElementById('controlEnd')
const sunflower = new Sunflower(document.getElementById('sunflower-canvas'), 8)
const animationLength = 26000 // milliseconds
let animationFrameID

controlStep.addEventListener('input', event => {
  sunflower.value = event.target.value
  if (animationFrameID) {
    window.cancelAnimationFrame(animationFrameID)
    animationFrameID = undefined
    startAnimation()
  }
})

function startAnimation () {
  const time0 = window.performance.now() - animationLength * controlStep.value

  function drawFrame (timeStamp) {
    const value = (timeStamp - time0) / animationLength
    if (value <= 1) {
      controlStep.value = value
      sunflower.value = value
      animationFrameID = window.requestAnimationFrame(drawFrame)
    } else {
      animationFrameID = undefined
      controlPause.hidden = true
      controlStart.hidden = false
      controlStep.value = 1
      sunflower.value = 1
    }
  }

  animationFrameID = window.requestAnimationFrame(drawFrame)
}

controlStart.addEventListener('click', () => {
  controlStart.hidden = true
  controlPause.hidden = false
  if (controlStep.value === 1) {
    controlStep.value = 0
    sunflower.value = 0
  }
  startAnimation()
})

controlPause.addEventListener('click', () => {
  if (animationFrameID) {
    window.cancelAnimationFrame(animationFrameID)
    animationFrameID = undefined
  }
  controlPause.hidden = true
  controlStart.hidden = false
})

controlBegin.addEventListener('click', () => {
  controlStep.value = 0
  sunflower.value = 0
  if (animationFrameID) {
    window.cancelAnimationFrame(animationFrameID)
    animationFrameID = undefined
    startAnimation()
  }
})

controlEnd.addEventListener('click', () => {
  if (animationFrameID) {
    window.cancelAnimationFrame(animationFrameID)
    animationFrameID = undefined
  }
  controlPause.hidden = true
  controlStart.hidden = false
  controlStep.value = 1
  sunflower.value = 1
})

controlPause.hidden = true
sunflower.value = controlStep.value
