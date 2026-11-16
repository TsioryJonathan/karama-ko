const button = document.getElementById('theme')
button.addEventListener('click', () => {
  const dark = document.body.classList.toggle('dark')
  button.setAttribute('aria-pressed', String(dark))
  button.textContent = dark ? 'Fond clair' : 'Fond sombre'
})

// A fresh URL restarts the autonomous SVG timelines, including cached images.
document.getElementById('replay').addEventListener('click', () => {
  const replay = Date.now()
  document.querySelectorAll('.states img').forEach((image) => {
    const source = new URL(image.src)
    source.searchParams.set('replay', String(replay))
    image.src = source.href
  })
})
