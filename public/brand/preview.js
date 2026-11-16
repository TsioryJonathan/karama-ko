const button = document.getElementById('theme')
button.addEventListener('click', () => {
  const dark = document.body.classList.toggle('dark')
  button.setAttribute('aria-pressed', String(dark))
  button.textContent = dark ? 'Fond clair' : 'Fond sombre'
})
