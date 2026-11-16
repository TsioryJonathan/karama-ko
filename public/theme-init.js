// Sets the theme before the first paint, so the page never flashes the wrong one.
try {
  var t = localStorage.getItem('karama:theme')
  if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = t
} catch (e) {}
